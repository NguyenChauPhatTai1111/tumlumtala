package seeders

import (
	"encoding/json"
	"fmt"
	"math/rand"
	"time"

	"github.com/brianvoe/gofakeit/v7"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"github.com/tumlumtala/messenger-service/internal/infrastructure/persistence/model"
)

type MessengerSeeder struct{}

func (s *MessengerSeeder) Name() string { return "MessengerSeeder" }

var (
	sampleMessages = []string{
		"Hello!", "Bạn đang làm gì?", "OK nhé 👍", "Mai gặp nha",
		"Đã nhận được", "Check inbox giúp mình", "Có gì mới không?",
		"Thanks!", "Đợi xíu nhé", "Đi ăn chưa?",
	}
	chatSubjects = []string{"Mình", "Tôi", "Team", "Anh", "Em"}
	chatVerbs    = []string{"đang làm", "đã hoàn thành", "sẽ xử lý", "đang kiểm tra"}
	chatObjects  = []string{"task", "bug", "feature", "ticket", "API"}
	chatEmojis   = []string{"😀", "😂", "👍", "🔥", "❤️"}
)

func randomChat() string {
	switch rand.Intn(3) {
	case 0:
		return sampleMessages[rand.Intn(len(sampleMessages))]
	case 1:
		return fmt.Sprintf("%s %s %s",
			chatSubjects[rand.Intn(len(chatSubjects))],
			chatVerbs[rand.Intn(len(chatVerbs))],
			chatObjects[rand.Intn(len(chatObjects))],
		)
	default:
		return gofakeit.Sentence(6)
	}
}

func addEmoji(msg string) string {
	if rand.Intn(2) == 0 {
		return msg + " " + chatEmojis[rand.Intn(len(chatEmojis))]
	}
	return msg
}

type seededReaction struct {
	UserID uint   `json:"user_id"`
	Emoji  string `json:"emoji"`
}
type seededMetadata struct {
	Reactions []seededReaction `json:"reactions,omitempty"`
}

func buildMetadata(participants []uint) string {
	if len(participants) == 0 || rand.Intn(100) >= 35 {
		return "{}"
	}
	max := 3
	if len(participants) < max {
		max = len(participants)
	}
	n := 1 + rand.Intn(max)
	perm := rand.Perm(len(participants))
	reactions := make([]seededReaction, 0, n)
	for i := 0; i < n; i++ {
		reactions = append(reactions, seededReaction{
			UserID: participants[perm[i]],
			Emoji:  chatEmojis[rand.Intn(len(chatEmojis))],
		})
	}
	b, _ := json.Marshal(seededMetadata{Reactions: reactions})
	return string(b)
}

// userRow is a minimal projection from the shared users table.
type userRow struct {
	ID uint `gorm:"column:id"`
}

func (s *MessengerSeeder) Run(db *gorm.DB) error {
	rand.Seed(time.Now().UnixNano()) //nolint:staticcheck
	gofakeit.Seed(time.Now().UnixNano())

	var users []userRow
	if err := db.Raw("SELECT id FROM user_snapshots ORDER BY id ASC LIMIT 10").Scan(&users).Error; err != nil {
		return fmt.Errorf("fetch users: %w", err)
	}
	if len(users) < 2 {
		fmt.Println("[MessengerSeeder] need at least 2 users in `users` table — skipping")
		return nil
	}

	ids := make([]uint, len(users))
	for i, u := range users {
		ids[i] = u.ID
	}

	now := time.Now()

	type convSpec struct {
		isGroup bool
		name    string
		creator uint
		emoji   string
		members []uint
	}

	safe := func(idx int) uint {
		if idx >= len(ids) {
			return ids[len(ids)-1]
		}
		return ids[idx]
	}

	specs := []convSpec{
		{false, "", safe(0), "😀", []uint{safe(0), safe(1)}},
		{false, "", safe(2), "👍", []uint{safe(2), safe(3)}},
		{true, "Team Alpha", safe(0), "😄", []uint{safe(0), safe(1), safe(2), safe(3), safe(4)}},
		{true, "Team Beta", safe(4), "😁", []uint{safe(4), safe(5), safe(6), safe(7)}},
		{true, "All Hands", safe(0), "🎉", ids},
	}

	for _, spec := range specs {
		conv := model.UserConversation{
			IsGroup:       spec.isGroup,
			Name:          spec.name,
			CreatedBy:     spec.creator,
			QuickReaction: spec.emoji,
			CreatedAt:     now,
			UpdatedAt:     now,
			LastMessageAt: &now,
		}
		if err := db.Clauses(clause.OnConflict{DoNothing: true}).Create(&conv).Error; err != nil {
			return fmt.Errorf("create conversation: %w", err)
		}

		// Participants
		for _, uid := range spec.members {
			role := "member"
			if uid == spec.creator {
				role = "owner"
			}
			p := model.UserConversationParticipant{
				ConversationID:       conv.ID,
				UserID:               uid,
				Role:                 role,
				NotificationsEnabled: true,
				IsArchived:           false,
				CreatedAt:            &now,
			}
			if err := db.Clauses(clause.OnConflict{
				Columns:   []clause.Column{{Name: "conversation_id"}, {Name: "user_id"}},
				DoUpdates: clause.Assignments(map[string]interface{}{"role": role}),
			}).Create(&p).Error; err != nil {
				return fmt.Errorf("create participant: %w", err)
			}
		}

		// Messages
		var msgs []model.UserMessage
		unread := make(map[uint]int64)
		total := 10 + rand.Intn(91)

		for j := 0; j < total; j++ {
			senderID := spec.members[rand.Intn(len(spec.members))]
			ts := now.Add(-time.Duration(total-j) * time.Second)

			msg := model.UserMessage{
				ConversationID: conv.ID,
				SenderID:       senderID,
				Content:        addEmoji(randomChat()),
				MessageType:    "text",
				Metadata:       buildMetadata(spec.members),
				CreatedAt:      ts,
				UpdatedAt:      ts,
			}

			if len(msgs) > 0 && rand.Intn(100) < 30 {
				start := 0
				if len(msgs) > 10 {
					start = len(msgs) - 10
				}
				parent := msgs[start+rand.Intn(len(msgs)-start)]
				msg.ReplyToMessageID = &parent.ID
			}

			if err := db.Create(&msg).Error; err != nil {
				return fmt.Errorf("create message: %w", err)
			}
			msgs = append(msgs, msg)

			for _, pid := range spec.members {
				if pid != senderID {
					unread[pid]++
				}
			}
		}

		if len(msgs) == 0 {
			continue
		}

		last := msgs[len(msgs)-1]
		lastReadSeq := last.ID

		if err := db.Model(&model.UserConversation{}).Where("id = ?", conv.ID).
			Updates(map[string]interface{}{
				"last_message_id":        last.ID,
				"last_message_at":        last.CreatedAt,
				"last_message_content":   last.Content,
				"last_message_sender_id": last.SenderID,
				"updated_at":             last.CreatedAt,
			}).Error; err != nil {
			return fmt.Errorf("update conv: %w", err)
		}

		for _, pid := range spec.members {
			if err := db.Model(&model.UserConversationParticipant{}).
				Where("conversation_id = ? AND user_id = ?", conv.ID, pid).
				Updates(map[string]interface{}{
					"unread_count":  unread[pid],
					"last_read_seq": lastReadSeq,
				}).Error; err != nil {
				return fmt.Errorf("update participant: %w", err)
			}
		}
	}

	fmt.Println("[MessengerSeeder] seeded 5 conversations with messages")
	return nil
}

