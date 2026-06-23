// Package consumer exposes the production-grade Kafka consumer for use by
// other services. It re-exports the internal implementation behind a public API.
package consumer

import (
	"context"
	"log/slog"

	"github.com/tumlumtala/kafka-service/envelope"
	internal "github.com/tumlumtala/kafka-service/internal/consumer"
	"github.com/tumlumtala/kafka-service/internal/producer"
)

// Handler processes an unwrapped envelope. Returning a non-nil error triggers
// the retry + DLQ logic configured on the Consumer.
type Handler = internal.Handler

// Config holds all consumer tunables. See internal/consumer for field docs.
type Config = internal.Config

// Consumer is a single-topic, multi-worker Kafka consumer with envelope
// unwrapping, exponential-backoff retry, and DLQ routing.
type Consumer = internal.Consumer

// New creates a Consumer ready to Run.
// dlqProducer may be nil — messages will only be logged on failure (tests only).
// In production always supply a dlqProducer via producer.New().
func New(cfg Config, dlqProducer *producer.Producer, handler Handler, log *slog.Logger) *Consumer {
	return internal.New(cfg, dlqProducer, handler, log)
}

// Unmarshal decodes an envelope Payload into the typed struct T.
func Unmarshal[T any](env envelope.Envelope) (T, error) {
	return internal.Unmarshal[T](env)
}

// Run is a convenience wrapper that starts a Consumer and blocks until ctx is done.
func Run(ctx context.Context, c *Consumer) {
	c.Run(ctx)
}
