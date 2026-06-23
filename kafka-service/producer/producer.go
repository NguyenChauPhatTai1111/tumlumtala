// Package producer exposes the production-grade Kafka producer for use by
// other services. It re-exports the internal implementation behind a public API.
package producer

import (
	"context"

	"github.com/tumlumtala/kafka-service/envelope"
	internal "github.com/tumlumtala/kafka-service/internal/producer"
)

// Config holds tunable producer settings.
type Config = internal.Config

// PublishOptions carries optional per-message metadata.
type PublishOptions = internal.PublishOptions

// Producer wraps kafka.Writer with production-grade defaults.
type Producer = internal.Producer

// New creates a Producer with production settings (RequireAll acks, Hash
// partitioning, Snappy compression, 5 write retries).
func New(cfg Config) *Producer {
	return internal.New(cfg)
}

// Publish wraps payload in an Envelope and writes it to topic.
func Publish(ctx context.Context, p *Producer, topic, key string, payload any, opts PublishOptions) error {
	return p.Publish(ctx, topic, key, payload, opts)
}

// PublishDLQ sends a DeadLetter record to the given DLQ topic.
func PublishDLQ(ctx context.Context, p *Producer, dlqTopic string, dead envelope.DeadLetter) error {
	return p.PublishDLQ(ctx, dlqTopic, dead)
}
