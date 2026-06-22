package repository

import (
	"context"
	"encoding/json"
	"strings"
	"time"

	"gorm.io/gorm"

	"github.com/tumlumtala/messenger-service/internal/domain/entity"
	"github.com/tumlumtala/messenger-service/internal/domain/repository"
	"github.com/tumlumtala/messenger-service/internal/infrastructure/persistence/model"
	"github.com/tumlumtala/messenger-service/internal/shared/utils"
)

type UserMessageRepository struct {
	db *gorm.DB
}

func NewUserMessageRepository(db *gorm.DB) repository.UserMessageRepository {
	return &UserMessageRepository{db: db}
}

type fileMetadata struct {
	OriginalName string `json:"original_name,omitempty"`
	Size         int64  `json:"size,omitempty"`
	MimeType     string `json:"mime_type,omitempty"`
	Duration     int64  `json:"duration,omitempty"` // in seconds, for videos
}

type messageMetadata struct {
	DeletedForUsers []uint                   `json:"deleted_for_users,omitempty"`
	Reactions       []entity.MessageReaction `json:"reactions,omitempty"`
	File            *fileMetadata            `json:"file,omitempty"`
	ReactToUser     uint                     `json:"react_to_user,omitempty"`
}

func containsUserID(ids []uint, target uint) bool {
	for _, id := range ids {
		if id == target {
			return true
		}
	}
	return false
}

func parseMessageMetadata(raw string) messageMetadata {
	if raw == "" {
		return messageMetadata{}
	}

	var md messageMetadata
	if err := json.Unmarshal([]byte(raw), &md); err != nil {
		return messageMetadata{}
	}
	return md
}

func marshalMessageMetadata(md messageMetadata) string {
	b, err := json.Marshal(md)
	if err != nil {
		return "{}"
	}
	return string(b)
}

func (r *UserMessageRepository) CreateMessage(ctx context.Context, message *entity.UserMessage) error {
	m := model.MessageFromEntity(message)
	if err := r.db.WithContext(ctx).Create(m).Error; err != nil {
		return err
	}
	message.ID = m.ID
	message.Seq = m.ID
	message.CreatedAt = m.CreatedAt
	message.UpdatedAt = m.UpdatedAt

	type senderRow struct {
		SenderName   string
		SenderGender string
	}
	var sender senderRow
	r.db.WithContext(ctx).
		Table("conversation_participants ucp").
		Select("COALESCE(NULLIF(ucp.nickname, ''), u.fullname) AS sender_name, '' AS sender_gender").
		Joins("JOIN user_snapshots u ON u.id = ucp.user_id").
		Where("ucp.conversation_id = ? AND ucp.user_id = ? AND ucp.deleted_at IS NULL", message.ConversationID, message.SenderID).
		Scan(&sender)
	message.SenderName = strings.TrimSpace(sender.SenderName)
	message.SenderGender = sender.SenderGender
	return nil
}

func (r *UserMessageRepository) GetMessageByID(ctx context.Context, messageID uint) (*entity.UserMessage, error) {
	var row model.UserMessage
	if err := r.db.WithContext(ctx).
		Where("id = ? AND deleted_at IS NULL", messageID).
		First(&row).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}
	return row.ToEntity(), nil
}

func (r *UserMessageRepository) GetMessagesByConversationID(
	ctx context.Context,
	conversationID,
	userID uint,
	filter utils.QueryFilter,
) ([]entity.UserMessage, int64, error) {

	// =========================
	// visible_from
	// =========================

	type visibleFrom struct {
		MessagesVisibleFrom *time.Time
	}

	var vf visibleFrom

	r.db.WithContext(ctx).
		Table("conversation_participants").
		Select("messages_visible_from").
		Where(
			"conversation_id = ? AND user_id = ? AND deleted_at IS NULL",
			conversationID,
			userID,
		).
		Scan(&vf)

	// =========================
	// base query
	// =========================

	baseQuery := r.db.WithContext(ctx).
		Table("messages um").
		Where(
			"um.conversation_id = ? AND um.deleted_at IS NULL",
			conversationID,
		).
		Where(`
			JSON_CONTAINS(
				COALESCE(
					JSON_EXTRACT(um.metadata, '$.deleted_for_users'),
					JSON_ARRAY()
				),
				JSON_ARRAY(?)
			) = 0
		`, userID)

	if vf.MessagesVisibleFrom != nil {
		baseQuery = baseQuery.Where(
			"um.created_at >= ?",
			vf.MessagesVisibleFrom,
		)
	}

	if msgType := filter.GetString("message_type"); msgType != "" {
		baseQuery = baseQuery.Where("um.message_type = ?", msgType)
	} else {
		baseQuery = baseQuery.Where("um.message_type != 'reaction'")
	}

	// =========================
	// total
	// =========================

	var total int64

	if err := baseQuery.
		Select("COUNT(1)").
		Scan(&total).Error; err != nil {
		return nil, 0, err
	}

	// =========================
	// rows
	// =========================

	var rows []entity.UserMessage

	if err := baseQuery.
		Select(`
			um.id,
			um.conversation_id,
			um.sender_id,

			COALESCE(
				NULLIF(ucp.nickname, ''),
				u.fullname
			) AS sender_name,

			'' AS sender_gender,

			um.content,
			um.message_type,
			um.reply_to_message_id,
			um.metadata,

			um.created_at,
			um.updated_at,

			CASE
				WHEN um.message_type = 'emoji'
				THEN COALESCE(e.emoji_source_type, '')
				ELSE ''
			END AS emoji_source_type,

			rm.content AS reply_to_content,
			rm.sender_id AS reply_to_sender_id
		`).
		Joins(`
			LEFT JOIN conversation_participants ucp
				ON ucp.conversation_id = um.conversation_id
				AND ucp.user_id = um.sender_id
				AND ucp.deleted_at IS NULL
		`).
		Joins(`
			LEFT JOIN user_snapshots u
				ON u.id = um.sender_id
		`).
		Joins(`
			LEFT JOIN (
				SELECT
					icon_text,
					MAX(source_type) AS emoji_source_type
				FROM emojis
				GROUP BY icon_text
			) e
				ON e.icon_text = um.content
		`).
		Joins(`
			LEFT JOIN messages rm
				ON rm.id = um.reply_to_message_id
				AND rm.deleted_at IS NULL
		`).
		Order("um.created_at DESC").
		Limit(filter.Limit).
		Offset(filter.Offset).
		Find(&rows).Error; err != nil {
		return nil, 0, err
	}

	// =========================
	// message ids
	// =========================

	messageIDs := make([]uint, 0, len(rows))

	for _, row := range rows {
		messageIDs = append(messageIDs, row.ID)
	}

	// =========================
	// histories
	// =========================

	var historyRows []entity.UserMessageHistory

	if len(messageIDs) > 0 {
		if err := r.db.WithContext(ctx).
			Table("message_histories").
			Select([]string{
				"id",
				"message_id",
				"content",
				"edited_by",
				"edited_at",
			}).
			Where("message_id IN ?", messageIDs).
			Order("edited_at ASC").
			Find(&historyRows).Error; err != nil {
			return nil, 0, err
		}
	}

	// =========================
	// group histories
	// =========================

	historyMap := make(map[uint][]entity.UserMessageHistory)

	for _, h := range historyRows {
		historyMap[h.MessageID] = append(
			historyMap[h.MessageID],
			entity.UserMessageHistory{
				ID:        h.ID,
				MessageID: h.MessageID,
				EditedBy:  h.EditedBy,
				EditedAt:  h.EditedAt,
				Content:   h.Content,
			},
		)
	}

	// =========================
	// build response
	// =========================

	items := make([]entity.UserMessage, len(rows))

	for i, row := range rows {
		meta := parseMessageMetadata(row.Metadata)

		items[i] = entity.UserMessage{
			ID:               row.ID,
			ConversationID:   row.ConversationID,
			Seq:              row.ID,
			SenderID:         row.SenderID,
			SenderName:       row.SenderName,
			SenderGender:     row.SenderGender,
			Content:          row.Content,
			MessageType:      row.MessageType,
			EmojiSourceType:  row.EmojiSourceType,
			ReplyToMessageID: row.ReplyToMessageID,
			ReplyToContent:   row.ReplyToContent,
			ReplyToSenderID:  row.ReplyToSenderID,
			Metadata:         row.Metadata,
			Reactions:        meta.Reactions,
			CreatedAt:        row.CreatedAt,
			UpdatedAt:        row.UpdatedAt,
			Histories:        historyMap[row.ID],
		}
	}

	return items, total, nil
}

func (r *UserMessageRepository) UpdateMessage(ctx context.Context, messageID uint, content string) (*entity.UserMessage, error) {
	trimmed := strings.TrimSpace(content)
	now := time.Now()

	if err := r.db.WithContext(ctx).
		Model(&model.UserMessage{}).
		Where("id = ? AND deleted_at IS NULL", messageID).
		Updates(map[string]any{
			"content":    trimmed,
			"updated_at": now,
		}).Error; err != nil {
		return nil, err
	}

	type row struct {
		ID             uint
		ConversationID uint
		SenderID       uint
		SenderName     string
		Content        string
		UpdatedAt      time.Time
	}

	var out row
	err := r.db.WithContext(ctx).
		Table("messages um").
		Select(`
			um.id,
			um.conversation_id,
			um.sender_id,
			COALESCE(NULLIF(ucp.nickname, ''), u.fullname) AS sender_name,
			um.content,
			um.updated_at
		`).
		Joins("LEFT JOIN conversation_participants ucp ON ucp.conversation_id = um.conversation_id AND ucp.user_id = um.sender_id AND ucp.deleted_at IS NULL").
		Joins("LEFT JOIN user_snapshots u ON u.id = um.sender_id").
		Where("um.id = ? AND um.deleted_at IS NULL", messageID).
		Take(&out).Error
	if err != nil {
		return nil, err
	}

	return &entity.UserMessage{
		ID:             out.ID,
		ConversationID: out.ConversationID,
		Seq:            out.ID,
		SenderID:       out.SenderID,
		SenderName:     out.SenderName,
		Content:        out.Content,
		UpdatedAt:      out.UpdatedAt,
	}, nil
}

func (r *UserMessageRepository) SetReaction(ctx context.Context, messageID, userID uint, reaction string) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var msg model.UserMessage
		if err := tx.Where("id = ? AND deleted_at IS NULL", messageID).First(&msg).Error; err != nil {
			return err
		}

		md := parseMessageMetadata(msg.Metadata)
		updated := false
		for i := range md.Reactions {
			if md.Reactions[i].UserID == userID {
				md.Reactions[i].Emoji = reaction
				updated = true
				break
			}
		}
		if !updated {
			md.Reactions = append(md.Reactions, entity.MessageReaction{UserID: userID, Emoji: reaction})
		}

		return tx.Model(&model.UserMessage{}).
			Where("id = ?", messageID).
			Update("metadata", marshalMessageMetadata(md)).Error
	})
}

func (r *UserMessageRepository) RemoveReaction(ctx context.Context, messageID, userID uint) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var msg model.UserMessage
		if err := tx.Where("id = ? AND deleted_at IS NULL", messageID).First(&msg).Error; err != nil {
			return err
		}

		md := parseMessageMetadata(msg.Metadata)
		if len(md.Reactions) == 0 {
			return nil
		}

		filtered := make([]entity.MessageReaction, 0, len(md.Reactions))
		for _, rct := range md.Reactions {
			if rct.UserID != userID {
				filtered = append(filtered, rct)
			}
		}
		md.Reactions = filtered

		return tx.Model(&model.UserMessage{}).
			Where("id = ?", messageID).
			Update("metadata", marshalMessageMetadata(md)).Error
	})
}

func (r *UserMessageRepository) DeleteMessage(ctx context.Context, messageID, senderID uint) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var msg model.UserMessage
		if err := tx.Where("id = ? AND deleted_at IS NULL", messageID).First(&msg).Error; err != nil {
			return err
		}

		// Only participants of the conversation can hide the message locally.
		var participantCount int64
		if err := tx.Model(&model.UserConversationParticipant{}).
			Where("conversation_id = ? AND user_id = ? AND deleted_at IS NULL", msg.ConversationID, senderID).
			Count(&participantCount).Error; err != nil {
			return err
		}
		if participantCount == 0 {
			return gorm.ErrRecordNotFound
		}

		md := parseMessageMetadata(msg.Metadata)
		if !containsUserID(md.DeletedForUsers, senderID) {
			md.DeletedForUsers = append(md.DeletedForUsers, senderID)
		}

		return tx.Model(&model.UserMessage{}).
			Where("id = ?", messageID).
			Update("metadata", marshalMessageMetadata(md)).Error
	})
}

func (r *UserMessageRepository) SearchMessages(ctx context.Context, conversationID uint, query string, filter utils.QueryFilter) ([]entity.UserMessage, int64, error) {
	if filter.Limit <= 0 {
		filter.Limit = 20
	}

	var total int64
	countQuery := r.db.WithContext(ctx).Model(&model.UserMessage{}).
		Where("conversation_id = ? AND deleted_at IS NULL AND LOWER(content) LIKE LOWER(?)", conversationID, "%"+query+"%")
	if err := countQuery.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var rows []model.UserMessage
	err := r.db.WithContext(ctx).
		Where("conversation_id = ? AND deleted_at IS NULL AND LOWER(content) LIKE LOWER(?)", conversationID, "%"+query+"%").
		Order("created_at DESC").
		Limit(filter.Limit).
		Offset(filter.Offset).
		Find(&rows).Error
	if err != nil {
		return nil, 0, err
	}

	items := make([]entity.UserMessage, len(rows))
	for i, row := range rows {
		items[i] = *row.ToEntity()
		items[i].Reactions = parseMessageMetadata(row.Metadata).Reactions
	}

	return items, total, nil
}

func (r *UserMessageRepository) SearchAllMessages(ctx context.Context, userID uint, query string, filter utils.QueryFilter) ([]entity.UserMessage, error) {
	if filter.Limit <= 0 {
		filter.Limit = 20
	}

	var rows []model.UserMessage
	err := r.db.WithContext(ctx).
		Table("messages um").
		Joins("JOIN conversation_participants ucp ON ucp.conversation_id = um.conversation_id AND ucp.user_id = ? AND ucp.deleted_at IS NULL", userID).
		Where("um.deleted_at IS NULL AND LOWER(um.content) LIKE LOWER(?)", "%"+query+"%").
		Where("(ucp.messages_visible_from IS NULL OR um.created_at >= ucp.messages_visible_from)").
		Where(`
			JSON_CONTAINS(
				COALESCE(
					JSON_EXTRACT(um.metadata, '$.deleted_for_users'),
					JSON_ARRAY()
				),
				JSON_ARRAY(?)
			) = 0
		`, userID).
		Order("um.created_at DESC").
		Limit(filter.Limit).
		Offset(filter.Offset).
		Find(&rows).Error
	if err != nil {
		return nil, err
	}

	items := make([]entity.UserMessage, len(rows))
	for i, row := range rows {
		items[i] = *row.ToEntity()
		items[i].Reactions = parseMessageMetadata(row.Metadata).Reactions
	}

	return items, nil
}
