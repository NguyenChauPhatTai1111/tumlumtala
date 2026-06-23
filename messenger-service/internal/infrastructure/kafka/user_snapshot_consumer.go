package kafka

import (
	"context"
	"encoding/json"
	"log"
	"time"

	"github.com/segmentio/kafka-go"
	"gorm.io/gorm"
)

const (
	topicUserCreated = "user.created"
	topicUserUpdated = "user.updated"
	topicUserDeleted = "user.deleted"

	groupID = "messenger-service"
)

type userEvent struct {
	ID       uint64 `json:"id"`
	UUID     string `json:"uuid"`
	Email    string `json:"email"`
	Fullname string `json:"fullname"`
	Avatar   string `json:"avatar"`
	Role     string `json:"role"`
}

type UserSnapshotConsumer struct {
	db      *gorm.DB
	brokers []string
}

func NewUserSnapshotConsumer(db *gorm.DB, brokers []string) *UserSnapshotConsumer {
	return &UserSnapshotConsumer{db: db, brokers: brokers}
}

// Run starts all topic consumers. Blocks until ctx is cancelled.
func (c *UserSnapshotConsumer) Run(ctx context.Context) {
	go c.consume(ctx, topicUserCreated, c.handleUpsert)
	go c.consume(ctx, topicUserUpdated, c.handleUpsert)
	go c.consume(ctx, topicUserDeleted, c.handleDelete)
	<-ctx.Done()
}

func (c *UserSnapshotConsumer) consume(ctx context.Context, topic string, handle func(context.Context, []byte) error) {
	r := kafka.NewReader(kafka.ReaderConfig{
		Brokers:  c.brokers,
		Topic:    topic,
		GroupID:  groupID,
		MinBytes: 1,
		MaxBytes: 1e6,
	})
	defer func() { _ = r.Close() }()

	for {
		msg, err := r.ReadMessage(ctx)
		if err != nil {
			if ctx.Err() != nil {
				return
			}
			log.Printf("[kafka] read error topic=%s: %v", topic, err)
			continue
		}
		if err := handle(ctx, msg.Value); err != nil {
			log.Printf("[kafka] handle error topic=%s: %v", topic, err)
		}
	}
}

func (c *UserSnapshotConsumer) handleUpsert(ctx context.Context, payload []byte) error {
	var ev userEvent
	if err := json.Unmarshal(payload, &ev); err != nil {
		return err
	}
	return c.db.WithContext(ctx).Exec(`
		INSERT INTO user_snapshots (id, uuid, email, fullname, avatar, role, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)
		ON DUPLICATE KEY UPDATE
			email = VALUES(email),
			fullname = VALUES(fullname),
			avatar = VALUES(avatar),
			role = VALUES(role),
			updated_at = VALUES(updated_at)
	`, ev.ID, ev.UUID, ev.Email, ev.Fullname, ev.Avatar, ev.Role, time.Now().UTC()).Error
}

func (c *UserSnapshotConsumer) handleDelete(ctx context.Context, payload []byte) error {
	var ev struct {
		ID uint64 `json:"id"`
	}
	if err := json.Unmarshal(payload, &ev); err != nil {
		return err
	}
	return c.db.WithContext(ctx).
		Table("user_snapshots").
		Where("id = ?", ev.ID).
		Delete(nil).Error
}

