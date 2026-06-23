package kafka

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/segmentio/kafka-go"
)

const (
	topicUserCreated = "user.created"
	topicUserUpdated = "user.updated"
	topicUserDeleted = "user.deleted"
)

type userCreatedPayload struct {
	ID        uint64    `json:"id"`
	UUID      string    `json:"uuid"`
	Email     string    `json:"email"`
	Fullname  string    `json:"fullname"`
	Avatar    string    `json:"avatar"`
	Role      string    `json:"role"`
	CreatedAt time.Time `json:"created_at"`
}

type userUpdatedPayload struct {
	ID       uint64 `json:"id"`
	UUID     string `json:"uuid"`
	Email    string `json:"email"`
	Fullname string `json:"fullname"`
	Avatar   string `json:"avatar"`
	Role     string `json:"role"`
}

type userDeletedPayload struct {
	ID   uint64 `json:"id"`
	UUID string `json:"uuid"`
}

type EventPublisher struct {
	writer *kafka.Writer
}

func NewEventPublisher(brokers []string) *EventPublisher {
	return &EventPublisher{
		writer: &kafka.Writer{
			Addr:         kafka.TCP(brokers...),
			Balancer:     &kafka.LeastBytes{},
			RequiredAcks: kafka.RequireOne,
		},
	}
}

func (p *EventPublisher) PublishUserCreated(ctx context.Context, userID uint64, uuid, email, fullname, avatar, role string) error {
	return p.publish(ctx, topicUserCreated, uuid, userCreatedPayload{
		ID: userID, UUID: uuid, Email: email, Fullname: fullname, Avatar: avatar, Role: role, CreatedAt: time.Now().UTC(),
	})
}

func (p *EventPublisher) PublishUserUpdated(ctx context.Context, userID uint64, uuid, email, fullname, avatar, role string) error {
	return p.publish(ctx, topicUserUpdated, uuid, userUpdatedPayload{
		ID: userID, UUID: uuid, Email: email, Fullname: fullname, Avatar: avatar, Role: role,
	})
}

func (p *EventPublisher) PublishUserDeleted(ctx context.Context, userID uint64, uuid string) error {
	return p.publish(ctx, topicUserDeleted, uuid, userDeletedPayload{ID: userID, UUID: uuid})
}

func (p *EventPublisher) publish(ctx context.Context, topic, key string, payload any) error {
	b, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("kafka marshal: %w", err)
	}
	return p.writer.WriteMessages(ctx, kafka.Message{
		Topic: topic,
		Key:   []byte(key),
		Value: b,
		Time:  time.Now(),
	})
}

func (p *EventPublisher) Close() error {
	return p.writer.Close()
}
