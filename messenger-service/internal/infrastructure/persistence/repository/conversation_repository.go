package repository

import (
	"context"
	"strings"
	"time"

	"gorm.io/gorm"

	"github.com/tumlumtala/messenger-service/internal/domain/entity"
	"github.com/tumlumtala/messenger-service/internal/domain/repository"
	"github.com/tumlumtala/messenger-service/internal/infrastructure/persistence/model"
	"github.com/tumlumtala/messenger-service/internal/shared/utils"
)

type userConversationRepository struct {
	db *gorm.DB
}

func NewUserConversationRepository(db *gorm.DB) repository.UserConversationRepository {
	return &userConversationRepository{db: db}
}

func (r *userConversationRepository) CreateConversation(ctx context.Context, conv *entity.UserConversation, participantIDs []uint) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		m := model.ConversationFromEntity(conv)
		if err := tx.Create(m).Error; err != nil {
			return err
		}
		conv.ID = m.ID

		unique := make(map[uint]struct{})
		all := make([]uint, 0, len(participantIDs)+1)
		all = append(all, conv.CreatedBy)
		for _, id := range participantIDs {
			all = append(all, id)
		}

		for _, id := range all {
			if id == 0 {
				continue
			}
			if _, ok := unique[id]; ok {
				continue
			}
			unique[id] = struct{}{}

			role := "member"
			if id == conv.CreatedBy {
				role = "admin"
			}

			now := time.Now()
			p := &model.UserConversationParticipant{
				ConversationID:       conv.ID,
				UserID:               id,
				Role:                 role,
				NotificationsEnabled: true,
				IsArchived:           false,
				CreatedAt:            &now,
			}
			if err := tx.Create(p).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func (r *userConversationRepository) GetConversationByID(ctx context.Context, conversationID uint) (*entity.UserConversation, error) {
	var c model.UserConversation
	if err := r.db.WithContext(ctx).First(&c, conversationID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}
	return c.ToEntity(), nil
}

func (r *userConversationRepository) GetUserConversations(ctx context.Context, userID uint, filter utils.QueryFilter) ([]entity.UserConversation, int64, error) {
	countQuery := r.db.WithContext(ctx).
		Table("conversation_participants").
		Where("user_id = ? AND deleted_at IS NULL", userID)

	var total int64
	if err := countQuery.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	type conversationRow struct {
		entity.UserConversation
		ThemeID                  *uint   `gorm:"column:theme_id"`
		ThemeURL                 *string `gorm:"column:theme_url"`
		ThemePresetID            *string `gorm:"column:theme_preset_id"`
		ThemeName                *string `gorm:"column:theme_name"`
		ThemeBackground          *string `gorm:"column:theme_background"`
		ThemeBackgroundColor     *string `gorm:"column:theme_background_color"`
		ThemeIncomingBubbleColor *string `gorm:"column:theme_incoming_bubble_color"`
		ThemeOutgoingBubbleColor *string `gorm:"column:theme_outgoing_bubble_color"`
		ThemeIncomingTextColor   *string `gorm:"column:theme_incoming_text_color"`
		ThemeOutgoingTextColor   *string `gorm:"column:theme_outgoing_text_color"`
		CustomIncomingBubbleColor string  `gorm:"column:custom_incoming_bubble_color"`
		CustomOutgoingBubbleColor string  `gorm:"column:custom_outgoing_bubble_color"`
		CustomIncomingTextColor   string  `gorm:"column:custom_incoming_text_color"`
		CustomOutgoingTextColor   string  `gorm:"column:custom_outgoing_text_color"`
	}
	var rows []conversationRow
	query := `
		SELECT
			uc.id,
			uc.is_group,
			COALESCE(p.is_archived, false) AS is_archived,
			COALESCE(uc.name, '') AS name,
			COALESCE(uc.avatar, '') AS avatar,
			uc.theme_id,
			uc.theme_url,
			ct.id AS theme_id,
			ct.preset_id AS theme_preset_id,
			ct.name AS theme_name,
			ct.background AS theme_background,
			ct.background_color AS theme_background_color,
			ct.incoming_bubble_color AS theme_incoming_bubble_color,
			ct.outgoing_bubble_color AS theme_outgoing_bubble_color,
			ct.incoming_text_color AS theme_incoming_text_color,
			ct.outgoing_text_color AS theme_outgoing_text_color,
			COALESCE(uc.custom_incoming_bubble_color, '') AS custom_incoming_bubble_color,
			COALESCE(uc.custom_outgoing_bubble_color, '') AS custom_outgoing_bubble_color,
			COALESCE(uc.custom_incoming_text_color, '') AS custom_incoming_text_color,
			COALESCE(uc.custom_outgoing_text_color, '') AS custom_outgoing_text_color,
			COALESCE(uc.quick_reaction, '') AS quick_reaction,
			COALESCE(p.notifications_enabled, false) AS notifications_enabled,
			COALESCE(uc.created_by, 0) AS created_by,
			uc.created_at,
			uc.updated_at,
			CASE
				WHEN la.created_at IS NOT NULL THEN la.created_at
				WHEN um.id IS NULL AND uc.last_message_id IS NOT NULL
					THEN COALESCE(prev_msg.created_at, uc.last_message_at)
				WHEN um.message_type = 'reaction'
					AND (
						COALESCE(JSON_EXTRACT(um.metadata, '$.react_to_user'), 0) != ?
						OR COALESCE(p.unread_count, 0) = 0
					)
					THEN COALESCE(prev_msg.created_at, uc.last_message_at)
				ELSE uc.last_message_at
			END AS last_message_at,
			uc.last_message_id,
			um.content,

			-- Ưu tiên activity nếu mới hơn tin nhắn cuối (la join chỉ match khi created_at > um.created_at)
			-- Fallback về prev_msg nếu last message bị xóa cho user, hoặc là reaction VÀ:
			--   (1) current user không phải người nhận reaction, HOẶC
			--   (2) current user là người nhận nhưng đã đọc (unread_count = 0)
			CASE
				WHEN la.content IS NOT NULL
					THEN la.content
				WHEN um.id IS NULL AND uc.last_message_id IS NOT NULL
					THEN COALESCE(prev_msg.content, '')
				WHEN um.message_type = 'reaction'
					AND (
						COALESCE(JSON_EXTRACT(um.metadata, '$.react_to_user'), 0) != ?
						OR COALESCE(p.unread_count, 0) = 0
					)
					THEN COALESCE(prev_msg.content, '')
				WHEN COALESCE(uc.last_message_content, '') != ''
					THEN uc.last_message_content
				ELSE ''
			END AS last_message_content,

			CASE
				WHEN la.content IS NOT NULL
					THEN NULL
				WHEN um.id IS NULL AND uc.last_message_id IS NOT NULL
					THEN COALESCE(prev_msg.sender_id, uc.last_message_sender_id)
				WHEN um.message_type = 'reaction'
					AND (
						COALESCE(JSON_EXTRACT(um.metadata, '$.react_to_user'), 0) != ?
						OR COALESCE(p.unread_count, 0) = 0
					)
					THEN COALESCE(prev_msg.sender_id, uc.last_message_sender_id)
				ELSE uc.last_message_sender_id
			END AS last_message_sender_id,

			CASE
				WHEN la.content IS NOT NULL
					THEN 'activity'
				WHEN um.id IS NULL AND uc.last_message_id IS NOT NULL
					THEN COALESCE(prev_msg.message_type, '')
				WHEN um.message_type = 'reaction'
					AND (
						COALESCE(JSON_EXTRACT(um.metadata, '$.react_to_user'), 0) != ?
						OR COALESCE(p.unread_count, 0) = 0
					)
					THEN COALESCE(prev_msg.message_type, '')
				ELSE COALESCE(um.message_type, '')
			END AS last_message_type,

			CASE
				WHEN la.content IS NOT NULL
					THEN '{}'
				WHEN um.id IS NULL AND uc.last_message_id IS NOT NULL
					THEN COALESCE(prev_msg.metadata, '{}')
				WHEN um.message_type = 'reaction'
					AND (
						COALESCE(JSON_EXTRACT(um.metadata, '$.react_to_user'), 0) != ?
						OR COALESCE(p.unread_count, 0) = 0
					)
					THEN COALESCE(prev_msg.metadata, '{}')
				ELSE COALESCE(um.metadata, '{}')
			END AS last_message_metadata,

			CASE
				WHEN la.content IS NOT NULL
					THEN ''
				WHEN um.id IS NULL AND uc.last_message_id IS NOT NULL
					THEN COALESCE(prev_sender.fullname, '')
				WHEN um.message_type = 'reaction'
					AND (
						COALESCE(JSON_EXTRACT(um.metadata, '$.react_to_user'), 0) != ?
						OR COALESCE(p.unread_count, 0) = 0
					)
					THEN COALESCE(prev_sender.fullname, '')
				ELSE COALESCE(sender.fullname, '')
			END AS last_message_sender_name,

			COALESCE(p.unread_count, 0) AS unread_count,
			CASE
				WHEN p.last_read_seq IS NOT NULL THEN p.last_read_seq
				WHEN COALESCE(p.unread_count, 0) = 0 THEN
					CASE
						WHEN um.message_type = 'reaction' THEN prev_msg.id
						ELSE uc.last_message_id
					END
				ELSE NULL
			END AS last_read_message_id,

			CASE
				WHEN um.message_type = 'emoji'
				THEN COALESCE(e.emoji_source_type, '')
				ELSE ''
			END AS emoji_source_type,

			COALESCE(la.action_type, '') AS last_message_activity_type

		FROM conversations uc

		INNER JOIN conversation_participants p
			ON p.conversation_id = uc.id

		LEFT JOIN themes ct
			ON ct.id = uc.theme_id AND ct.status = 'active'

		LEFT JOIN user_snapshots sender
			ON sender.id = uc.last_message_sender_id

		LEFT JOIN messages um
			ON um.id = uc.last_message_id
			AND JSON_CONTAINS(COALESCE(JSON_EXTRACT(um.metadata, '$.deleted_for_users'), JSON_ARRAY()), JSON_ARRAY(?)) = 0

		-- Tin nhắn cuối không phải type reaction, dùng làm fallback
		LEFT JOIN LATERAL (
			SELECT m.id, m.content, m.sender_id, m.message_type, m.metadata, m.created_at
			FROM messages m
			WHERE m.conversation_id = uc.id
				AND m.deleted_at IS NULL
				AND m.message_type != 'reaction'
				AND JSON_CONTAINS(COALESCE(JSON_EXTRACT(m.metadata, '$.deleted_for_users'), JSON_ARRAY()), JSON_ARRAY(?)) = 0
			ORDER BY m.id DESC
			LIMIT 1
		) prev_msg ON TRUE

		LEFT JOIN user_snapshots prev_sender
			ON prev_sender.id = prev_msg.sender_id

		LEFT JOIN (
			SELECT
				icon_text,
				MAX(source_type) AS emoji_source_type
			FROM emojis
			GROUP BY icon_text
		) e
			ON e.icon_text = um.content

		LEFT JOIN (
			SELECT uca.conversation_id, uca.content, uca.action_type, latest.max_created_at AS created_at
			FROM conversation_activities uca
			INNER JOIN (
				SELECT conversation_id, MAX(created_at) AS max_created_at
				FROM conversation_activities
				GROUP BY conversation_id
			) latest ON latest.conversation_id = uca.conversation_id
				AND uca.created_at = latest.max_created_at
		) la ON la.conversation_id = uc.id
			AND la.created_at > COALESCE(um.created_at, uc.updated_at)

		WHERE p.user_id = ?
			AND p.deleted_at IS NULL
		ORDER BY COALESCE(uc.last_message_at, uc.updated_at) DESC
		LIMIT ? OFFSET ?
	`

	if err := r.db.WithContext(ctx).Raw(query, userID, userID, userID, userID, userID, userID, userID, userID, userID, filter.Limit, filter.Offset).Scan(&rows).Error; err != nil {
		return nil, 0, err
	}

	items := make([]entity.UserConversation, len(rows))
	for i, it := range rows {
		conv := entity.UserConversation{
			ID:                      it.ID,
			IsGroup:                 it.IsGroup,
			IsArchived:              it.IsArchived,
			Name:                    it.Name,
			Avatar:                  it.Avatar,
			ThemeID:                 it.ThemeID,
			ThemeURL:                derefStr(it.ThemeURL),
			NotificationsEnabled:    it.NotificationsEnabled,
			CreatedBy:               it.CreatedBy,
			CreatedAt:               it.CreatedAt,
			UpdatedAt:               it.UpdatedAt,
			LastMessageAt:           it.LastMessageAt,
			LastMessageID:           it.LastMessageID,
			LastMessageContent:      it.LastMessageContent,
			LastMessageSenderID:     it.LastMessageSenderID,
			LastMessageSenderName:   it.LastMessageSenderName,
			LastMessageType:         it.LastMessageType,
			LastMessageActivityType: it.LastMessageActivityType,
			LastMessageMetadata:     it.LastMessageMetadata,
			QuickReaction:           it.QuickReaction,
			EmojiSourceType:         it.EmojiSourceType,
			UnreadCount:             it.UnreadCount,
			LastReadMessageID:       it.LastReadMessageID,
		}
		conv.CustomIncomingBubbleColor = it.CustomIncomingBubbleColor
		conv.CustomOutgoingBubbleColor = it.CustomOutgoingBubbleColor
		conv.CustomIncomingTextColor = it.CustomIncomingTextColor
		conv.CustomOutgoingTextColor = it.CustomOutgoingTextColor

		if it.ThemeID != nil {
			// Priority: custom colors in user_conversation > theme colors
			incomingBubble := coalesceStr(it.CustomIncomingBubbleColor, derefStr(it.ThemeIncomingBubbleColor))
			outgoingBubble := coalesceStr(it.CustomOutgoingBubbleColor, derefStr(it.ThemeOutgoingBubbleColor))
			incomingText := coalesceStr(it.CustomIncomingTextColor, derefStr(it.ThemeIncomingTextColor))
			outgoingText := coalesceStr(it.CustomOutgoingTextColor, derefStr(it.ThemeOutgoingTextColor))

			conv.Theme = &entity.ConversationTheme{
				ID:                  *it.ThemeID,
				PresetID:            derefStr(it.ThemePresetID),
				Name:                derefStr(it.ThemeName),
				Background:          derefStr(it.ThemeBackground),
				BackgroundColor:     derefStr(it.ThemeBackgroundColor),
				IncomingBubbleColor: incomingBubble,
				OutgoingBubbleColor: outgoingBubble,
				IncomingTextColor:   incomingText,
				OutgoingTextColor:   outgoingText,
			}
		}
		items[i] = conv
	}

	// Fetch participants for all returned conversations
	if len(items) > 0 {
		ids := make([]uint, len(items))
		for i, it := range items {
			ids[i] = it.ID
		}

		type participantRow struct {
			ConversationID uint
			UserID         uint
			FullName       string
			Email          string
			Avatar         string
			Gender         string
			Role           string
			Nickname       string
			LastReadAt     *time.Time
			LastReadSeq    *uint
		}

		var pRows []participantRow
		pQuery := `
			SELECT ucp.conversation_id, ucp.user_id, u.fullname AS full_name, u.email AS email, COALESCE(u.avatar, '') AS avatar, '' AS gender, COALESCE(ucp.nickname, '') AS nickname, ucp.role AS role, ucp.last_read_at, ucp.last_read_seq
			FROM conversation_participants ucp
			JOIN user_snapshots u ON u.id = ucp.user_id
			WHERE ucp.conversation_id IN ?
				AND ucp.deleted_at IS NULL`
		if err := r.db.WithContext(ctx).Raw(pQuery, ids).Scan(&pRows).Error; err != nil {
			return nil, 0, err
		}

		pMap := make(map[uint][]entity.ParticipantInfo, len(ids))
		for _, pr := range pRows {
			pMap[pr.ConversationID] = append(pMap[pr.ConversationID], entity.ParticipantInfo{
				ID:          pr.UserID,
				FullName:    pr.FullName,
				Email:       pr.Email,
				Avatar:      pr.Avatar,
				Gender:      pr.Gender,
				Role:        pr.Role,
				Nickname:    pr.Nickname,
				LastReadAt:  pr.LastReadAt,
				LastReadSeq: pr.LastReadSeq,
			})
		}
		for i := range items {
			items[i].Participants = pMap[items[i].ID]
		}
	}

	return items, total, nil
}

func (r *userConversationRepository) IsParticipant(ctx context.Context, conversationID, userID uint) (bool, error) {
	var count int64
	if err := r.db.WithContext(ctx).
		Table("conversation_participants").
		Where("conversation_id = ? AND user_id = ? AND deleted_at IS NULL", conversationID, userID).
		Count(&count).Error; err != nil {
		return false, err
	}
	return count > 0, nil
}

func (r *userConversationRepository) GetConversationIDsForUser(ctx context.Context, userID uint) ([]uint, error) {
	var ids []uint
	err := r.db.WithContext(ctx).
		Table("conversation_participants").
		Where("user_id = ? AND deleted_at IS NULL", userID).
		Pluck("conversation_id", &ids).Error
	return ids, err
}

func (r *userConversationRepository) GetParticipantUserIDsForUser(ctx context.Context, userID uint) ([]uint, error) {
	var ids []uint
	err := r.db.WithContext(ctx).Raw(`
		SELECT DISTINCT p2.user_id
		FROM conversation_participants p1
		JOIN conversation_participants p2 ON p2.conversation_id = p1.conversation_id AND p2.deleted_at IS NULL
		WHERE p1.user_id = ? AND p1.deleted_at IS NULL AND p2.user_id != ?
	`, userID, userID).Scan(&ids).Error
	return ids, err
}

func (r *userConversationRepository) ArchiveConversation(ctx context.Context, conversationID, userID uint) error {
	return r.db.WithContext(ctx).
		Model(&model.UserConversationParticipant{}).
		Where("conversation_id = ? AND user_id = ?", conversationID, userID).
		Update("is_archived", true).Error
}

func (r *userConversationRepository) RestoreConversation(ctx context.Context, conversationID, userID uint) error {
	return r.db.WithContext(ctx).
		Model(&model.UserConversationParticipant{}).
		Where("conversation_id = ? AND user_id = ?", conversationID, userID).
		Update("is_archived", false).Error
}

func (r *userConversationRepository) DeleteConversation(ctx context.Context, conversationID, userID uint) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Soft-delete: mark participant as deleted so they can be re-added when a new message arrives
		now := time.Now()
		if err := tx.Model(&model.UserConversationParticipant{}).
			Where("conversation_id = ? AND user_id = ? AND deleted_at IS NULL", conversationID, userID).
			Updates(map[string]interface{}{
				"deleted_at":            now,
				"unread_count":          0,
				"messages_visible_from": now,
			}).Error; err != nil {
			return err
		}

		// If all participants have soft-deleted, hard-delete the conversation
		var remaining int64
		if err := tx.Model(&model.UserConversationParticipant{}).
			Where("conversation_id = ? AND deleted_at IS NULL", conversationID).
			Count(&remaining).Error; err != nil {
			return err
		}

		if remaining == 0 {
			if err := tx.Delete(&model.UserConversation{}, conversationID).Error; err != nil {
				return err
			}
		}

		return nil
	})
}

func (r *userConversationRepository) RestoreDeletedParticipants(ctx context.Context, conversationID uint) error {
	return r.db.WithContext(ctx).
		Model(&model.UserConversationParticipant{}).
		Where("conversation_id = ? AND deleted_at IS NOT NULL", conversationID).
		Updates(map[string]interface{}{"deleted_at": nil, "is_archived": false}).Error
}

func (r *userConversationRepository) UpdateLastMessageAt(ctx context.Context, conversationID, messageID, senderID uint, content string) error {
	now := time.Now()
	trimmed := strings.TrimSpace(content)

	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&model.UserConversation{}).
			Where("id = ?", conversationID).
			Updates(map[string]interface{}{
				"last_message_at":        now,
				"last_message_id":        messageID,
				"last_message_content":   trimmed,
				"last_message_sender_id": senderID,
				"updated_at":             now,
			}).Error; err != nil {
			return err
		}

		return tx.Model(&model.UserConversationParticipant{}).
			Where("conversation_id = ? AND deleted_at IS NULL AND user_id <> ?", conversationID, senderID).
			Update("unread_count", gorm.Expr("unread_count + 1")).Error
	})
}

func (r *userConversationRepository) UpdateLastMessageAtReaction(ctx context.Context, conversationID, messageID, senderID, reactToUserID uint, content string) error {
	now := time.Now()
	trimmed := strings.TrimSpace(content)

	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&model.UserConversation{}).
			Where("id = ?", conversationID).
			Updates(map[string]interface{}{
				"last_message_at":        now,
				"last_message_id":        messageID,
				"last_message_content":   trimmed,
				"last_message_sender_id": senderID,
				"updated_at":             now,
			}).Error; err != nil {
			return err
		}

		// Only increment unread_count for the message owner (react_to_user)
		return tx.Model(&model.UserConversationParticipant{}).
			Where("conversation_id = ? AND deleted_at IS NULL AND user_id = ?", conversationID, reactToUserID).
			Update("unread_count", gorm.Expr("unread_count + 1")).Error
	})
}

func (r *userConversationRepository) UpdateLastMessageContent(ctx context.Context, conversationID, messageID uint, content string) error {
	trimmed := strings.TrimSpace(content)
	return r.db.WithContext(ctx).
		Model(&model.UserConversation{}).
		Where("id = ? AND last_message_id = ?", conversationID, messageID).
		Update("last_message_content", trimmed).Error
}

func (r *userConversationRepository) MarkRead(ctx context.Context, conversationID, userID uint, lastReadSeq *uint) error {
	// If lastReadSeq is provided, only update if it's greater than current value
	if lastReadSeq != nil {
		// If the provided seq belongs to a reaction message, find the latest non-reaction seq instead
		var msgType string
		r.db.WithContext(ctx).
			Table("messages").
			Select("message_type").
			Where("id = ? AND deleted_at IS NULL", *lastReadSeq).
			Scan(&msgType)
		if msgType == "reaction" {
			var prevSeq *uint
			r.db.WithContext(ctx).
				Table("messages").
				Select("MAX(id)").
				Where("conversation_id = ? AND deleted_at IS NULL AND message_type != 'reaction' AND id < ?", conversationID, *lastReadSeq).
				Scan(&prevSeq)
			if prevSeq != nil {
				lastReadSeq = prevSeq
			}
		}

		var currentSeq *uint
		if err := r.db.WithContext(ctx).
			Model(&model.UserConversationParticipant{}).
			Select("last_read_seq").
			Where("conversation_id = ? AND user_id = ?", conversationID, userID).
			Scan(&currentSeq).Error; err != nil {
			return err
		}

		updates := map[string]interface{}{
			"last_read_at": time.Now(),
			"unread_count": 0,
		}

		// Only move the read cursor forward, but always clear the unread counter.
		if currentSeq != nil && *lastReadSeq <= *currentSeq {
			return r.db.WithContext(ctx).
				Model(&model.UserConversationParticipant{}).
				Where("conversation_id = ? AND user_id = ?", conversationID, userID).
				Updates(updates).Error
		}

		updates["last_read_seq"] = *lastReadSeq
		return r.db.WithContext(ctx).
			Model(&model.UserConversationParticipant{}).
			Where("conversation_id = ? AND user_id = ?", conversationID, userID).
			Updates(updates).Error
	}

	// Fallback: if no lastReadSeq provided, use latest non-reaction message seq
	var latestSeq *uint
	r.db.WithContext(ctx).
		Table("messages").
		Select("MAX(id)").
		Where("conversation_id = ? AND deleted_at IS NULL AND message_type != 'reaction'", conversationID).
		Scan(&latestSeq)

	if latestSeq == nil {
		// No messages yet — nothing to mark
		return nil
	}

	return r.db.WithContext(ctx).
		Model(&model.UserConversationParticipant{}).
		Where("conversation_id = ? AND user_id = ?", conversationID, userID).
		Updates(map[string]interface{}{
			"last_read_at":  time.Now(),
			"last_read_seq": *latestSeq,
			"unread_count":  0,
		}).Error
}

func (r *userConversationRepository) UpdateConversation(ctx context.Context, conv *entity.UserConversation) error {
	m := model.ConversationFromEntity(conv)
	return r.db.WithContext(ctx).
		Model(&model.UserConversation{}).
		Where("id = ?", conv.ID).
		Updates(map[string]interface{}{
			"name":                         m.Name,
			"avatar":                       m.Avatar,
			"theme_id":                     m.ThemeID,
			"theme_url":                    m.ThemeURL,
			"quick_reaction":               m.QuickReaction,
			"custom_incoming_bubble_color": m.CustomIncomingBubbleColor,
			"custom_outgoing_bubble_color": m.CustomOutgoingBubbleColor,
			"custom_incoming_text_color":   m.CustomIncomingTextColor,
			"custom_outgoing_text_color":   m.CustomOutgoingTextColor,
		}).Error
}

func derefStr(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

func coalesceStr(vals ...string) string {
	for _, v := range vals {
		if v != "" {
			return v
		}
	}
	return ""
}

func (r *userConversationRepository) AddParticipant(ctx context.Context, participant *entity.UserConversationParticipant) error {
	m := &model.UserConversationParticipant{
		ConversationID:       participant.ConversationID,
		UserID:               participant.UserID,
		Role:                 participant.Role,
		Nickname:             participant.Nickname,
		NotificationsEnabled: true,
		IsArchived:           participant.IsArchived,
		CreatedAt:            participant.CreatedAt,
		LastReadAt:           participant.LastReadAt,
		LastReadSeq:          participant.LastReadSeq,
	}
	return r.db.WithContext(ctx).Create(m).Error
}

func (r *userConversationRepository) DeleteParticipant(ctx context.Context, conversationID, userID uint) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {

		// Hard delete participant
		if err := tx.
			Where("conversation_id = ? AND user_id = ?", conversationID, userID).
			Delete(&model.UserConversationParticipant{}).Error; err != nil {
			return err
		}

		// Check remaining participants
		var remaining int64
		if err := tx.Model(&model.UserConversationParticipant{}).
			Where("conversation_id = ?", conversationID).
			Count(&remaining).Error; err != nil {
			return err
		}

		// Delete conversation if no participants left
		if remaining == 0 {
			if err := tx.Delete(&model.UserConversation{}, conversationID).Error; err != nil {
				return err
			}
		}

		return nil
	})
}

func (r *userConversationRepository) UpdateParticipantNickname(ctx context.Context, conversationID, userID uint, nickname string) error {
	return r.db.WithContext(ctx).
		Model(&model.UserConversationParticipant{}).
		Where("conversation_id = ? AND user_id = ?", conversationID, userID).
		Update("nickname", nickname).Error
}

func (r *userConversationRepository) UpdateParticipantNotifications(ctx context.Context, conversationID, userID uint, enabled bool) error {
	return r.db.WithContext(ctx).
		Model(&model.UserConversationParticipant{}).
		Where("conversation_id = ? AND user_id = ?", conversationID, userID).
		Update("notifications_enabled", enabled).Error
}

func (r *userConversationRepository) GetParticipants(ctx context.Context, conversationID uint) ([]entity.ParticipantInfo, error) {
	var participants []entity.ParticipantInfo
	err := r.db.WithContext(ctx).
		Table("conversation_participants p").
		Select("u.id AS id, u.fullname AS full_name, u.email AS email, COALESCE(u.avatar, '') AS avatar, '' AS gender, COALESCE(p.nickname, '') AS nickname, p.last_read_at, p.last_read_seq").
		Joins("JOIN user_snapshots u ON p.user_id = u.id").
		Where("p.conversation_id = ? AND p.deleted_at IS NULL", conversationID).
		Scan(&participants).Error
	return participants, err
}

func (r *userConversationRepository) GetParticipant(ctx context.Context, conversationID, userID uint) (*entity.ParticipantInfo, error) {
	var participant entity.ParticipantInfo
	err := r.db.WithContext(ctx).
		Table("conversation_participants p").
		Select("u.id AS id, u.fullname AS full_name, u.email AS email, COALESCE(u.avatar, '') AS avatar, '' AS gender, COALESCE(p.nickname, '') AS nickname, p.last_read_at, p.last_read_seq").
		Joins("JOIN user_snapshots u ON p.user_id = u.id").
		Where("p.conversation_id = ? AND p.user_id = ? AND p.deleted_at IS NULL", conversationID, userID).
		Scan(&participant).Error
	if err != nil {
		return nil, err
	}
	if participant.ID == 0 {
		return nil, nil
	}
	return &participant, nil
}

func (r *userConversationRepository) FindNextOwner(ctx context.Context, conversationID, excludingUserID uint) (*entity.ParticipantInfo, error) {
	var participant entity.ParticipantInfo
	err := r.db.WithContext(ctx).
		Table("conversation_participants p").
		Select("u.id AS id, u.fullname AS full_name, u.email AS email, COALESCE(u.avatar, '') AS avatar, '' AS gender, COALESCE(p.nickname, '') AS nickname, p.last_read_at, p.last_read_seq").
		Joins("JOIN user_snapshots u ON p.user_id = u.id").
		Where("p.conversation_id = ? AND p.user_id <> ? AND p.deleted_at IS NULL", conversationID, excludingUserID).
		Order("p.created_at ASC").
		Limit(1).
		Scan(&participant).Error
	if err != nil {
		return nil, err
	}
	if participant.ID == 0 {
		return nil, nil
	}
	return &participant, nil
}

func (r *userConversationRepository) UpdateParticipantRole(ctx context.Context, conversationID, userID uint, role string) error {
	err := r.db.WithContext(ctx).
		Model(&model.UserConversationParticipant{}).
		Where("conversation_id = ? AND user_id = ?", conversationID, userID).
		Update("role", role).Error

	if err != nil {
		return err
	}

	return nil
}
