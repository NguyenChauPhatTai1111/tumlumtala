package kafka

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/segmentio/kafka-go"

	"github.com/tumlumtala/contracts/events"
	kfkenvelope "github.com/tumlumtala/kafka-service/envelope"
	"github.com/tumlumtala/kafka-service/topics"

	"encoding/json"
)

// EventPublisher publishes user domain events to Kafka.
//
// Production settings applied:
//   - RequireAll: leader + all in-sync replicas acknowledge before returning
//   - Hash balancer: same user UUID always maps to same partition (ordering guarantee)
//   - Snappy compression: good throughput/CPU tradeoff
//   - Envelope wrapper: every message carries event_id, trace_id, attempt metadata
type EventPublisher struct {
	writer *kafka.Writer
}

func NewEventPublisher(brokers []string) *EventPublisher {
	return &EventPublisher{
		writer: &kafka.Writer{
			Addr:                   kafka.TCP(brokers...),
			Balancer:               &kafka.Hash{},
			RequiredAcks:           kafka.RequireOne,
			Async:                  false,
			Compression:            kafka.Snappy,
			MaxAttempts:            5,
			WriteBackoffMin:        100 * time.Millisecond,
			WriteBackoffMax:        1 * time.Second,
			BatchSize:              100,
			BatchTimeout:           5 * time.Millisecond,
			WriteTimeout:           10 * time.Second,
			AllowAutoTopicCreation: false,
		},
	}
}

func (p *EventPublisher) PublishUserCreated(ctx context.Context, userID uint64, userUUID, email, fullname, avatar, role, status string) error {
	payload := events.UserCreatedEvent{
		ID:        userID,
		UUID:      userUUID,
		Email:     email,
		Fullname:  fullname,
		Avatar:    avatar,
		Role:      role,
		Status:    status,
		CreatedAt: time.Now().UTC(),
	}
	return p.publish(ctx, topics.UserCreated, userUUID, payload)
}

func (p *EventPublisher) PublishUserUpdated(ctx context.Context, userID uint64, userUUID, email, fullname, avatar, role, status string) error {
	payload := events.UserUpdatedEvent{
		ID:       userID,
		UUID:     userUUID,
		Email:    email,
		Fullname: fullname,
		Avatar:   avatar,
		Role:     role,
		Status:   status,
	}
	return p.publish(ctx, topics.UserUpdated, userUUID, payload)
}

func (p *EventPublisher) PublishUserDeleted(ctx context.Context, userID uint64, userUUID string) error {
	payload := events.UserDeletedEvent{
		ID:   userID,
		UUID: userUUID,
	}
	return p.publish(ctx, topics.UserDeleted, userUUID, payload)
}

// PublishUserUpserted publishes a user.upserted event used by cmd/replay for
// idempotent bulk re-sync. Consumers treat it as INSERT … ON DUPLICATE KEY UPDATE.
func (p *EventPublisher) PublishUserUpserted(ctx context.Context, userUUID string, ev events.UserUpsertedEvent) error {
	return p.publish(ctx, topics.UserUpserted, userUUID, ev)
}

func (p *EventPublisher) publish(ctx context.Context, topic, key string, payload any) error {
	raw, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("kafka event_publisher marshal payload: %w", err)
	}

	eventID := uuid.NewString()
	env := kfkenvelope.Envelope{
		EventID:     eventID,
		Topic:       topic,
		Attempt:     1,
		PublishedAt: time.Now().UTC(),
		Payload:     raw,
	}

	body, err := json.Marshal(env)
	if err != nil {
		return fmt.Errorf("kafka event_publisher marshal envelope: %w", err)
	}

	msg := kafka.Message{
		Topic: topic,
		Key:   []byte(key),
		Value: body,
		Time:  time.Now(),
		Headers: []kafka.Header{
			{Key: "event_id", Value: []byte(eventID)},
			{Key: "content-type", Value: []byte("application/json")},
		},
	}

	if err := p.writer.WriteMessages(ctx, msg); err != nil {
		return fmt.Errorf("kafka event_publisher write topic=%s: %w", topic, err)
	}
	return nil
}

func (p *EventPublisher) Close() error {
	return p.writer.Close()
}
