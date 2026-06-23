package producer

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/segmentio/kafka-go"

	"github.com/tumlumtala/kafka-service/envelope"
)

// Producer wraps kafka.Writer with production-grade defaults.
//
// Key production settings:
//   - RequireAll acks: leader + all in-sync replicas must acknowledge → no data loss on leader failure
//   - Async=false: synchronous publish so callers know the write succeeded
//   - Compression: Snappy for throughput without heavy CPU cost
//   - MaxAttempts: built-in kafka-go retry for transient broker errors
type Producer struct {
	writer *kafka.Writer
}

// Config holds tunable producer settings.
type Config struct {
	Brokers     []string
	ServiceName string // injected into envelope headers for observability
}

func New(cfg Config) *Producer {
	return &Producer{
		writer: &kafka.Writer{
			Addr:                   kafka.TCP(cfg.Brokers...),
			Balancer:               &kafka.Hash{}, // key-based partitioning → same key always goes to same partition (ordering guarantee)
			RequiredAcks:           kafka.RequireAll,
			Async:                  false,
			Compression:            kafka.Snappy,
			MaxAttempts:            5,
			WriteBackoffMin:        100 * time.Millisecond,
			WriteBackoffMax:        1 * time.Second,
			BatchSize:              100,
			BatchTimeout:           5 * time.Millisecond,
			ReadTimeout:            10 * time.Second,
			WriteTimeout:           10 * time.Second,
			AllowAutoTopicCreation: false, // topics must be pre-created; prevents accidental topic creation
		},
	}
}

// PublishOptions carries optional per-message metadata.
type PublishOptions struct {
	TraceID   string
	RequestID string
}

// Publish wraps payload in an Envelope and writes it to topic.
// key is used for partition assignment — should be a stable entity identifier (e.g. user UUID).
func (p *Producer) Publish(ctx context.Context, topic, key string, payload any, opts PublishOptions) error {
	raw, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("kafka producer marshal payload: %w", err)
	}

	env := envelope.Envelope{
		EventID:     uuid.NewString(),
		Topic:       topic,
		Attempt:     1,
		TraceID:     opts.TraceID,
		RequestID:   opts.RequestID,
		PublishedAt: time.Now().UTC(),
		Payload:     raw,
	}

	body, err := json.Marshal(env)
	if err != nil {
		return fmt.Errorf("kafka producer marshal envelope: %w", err)
	}

	msg := kafka.Message{
		Topic: topic,
		Key:   []byte(key),
		Value: body,
		Time:  time.Now(),
		Headers: []kafka.Header{
			{Key: "event_id", Value: []byte(env.EventID)},
			{Key: "trace_id", Value: []byte(opts.TraceID)},
			{Key: "request_id", Value: []byte(opts.RequestID)},
			{Key: "content-type", Value: []byte("application/json")},
		},
	}

	if err := p.writer.WriteMessages(ctx, msg); err != nil {
		return fmt.Errorf("kafka producer write topic=%s: %w", topic, err)
	}
	return nil
}

// PublishDLQ sends a dead-letter record to the DLQ topic. It does NOT use an
// envelope wrapper — DLQ messages are self-contained for simpler replay tooling.
func (p *Producer) PublishDLQ(ctx context.Context, dlqTopic string, dead envelope.DeadLetter) error {
	body, err := json.Marshal(dead)
	if err != nil {
		return fmt.Errorf("kafka producer marshal dlq: %w", err)
	}

	return p.writer.WriteMessages(ctx, kafka.Message{
		Topic: dlqTopic,
		Key:   []byte(dead.Envelope.EventID),
		Value: body,
		Time:  time.Now(),
		Headers: []kafka.Header{
			{Key: "dlq_reason", Value: []byte(dead.Reason)},
			{Key: "original_topic", Value: []byte(dead.Envelope.Topic)},
		},
	})
}

func (p *Producer) Close() error {
	return p.writer.Close()
}
