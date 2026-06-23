// Package consumer provides a production-grade Kafka consumer with:
//   - Manual offset commit (FetchMessage + CommitMessages) for at-least-once delivery
//   - Envelope unwrapping with attempt tracking
//   - Configurable exponential backoff retry
//   - DLQ publish on max retries exceeded or invalid payload
//   - Graceful shutdown via context cancellation
//   - Concurrent worker pool per topic
package consumer

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"math"
	"time"

	"github.com/segmentio/kafka-go"

	"github.com/tumlumtala/kafka-service/envelope"
	"github.com/tumlumtala/kafka-service/internal/producer"
	"github.com/tumlumtala/kafka-service/topics"
)

// Handler processes an unwrapped event payload.
// Returning a non-nil error triggers retry/DLQ logic.
type Handler func(ctx context.Context, env envelope.Envelope) error

// Config holds all consumer tunables.
type Config struct {
	Brokers    []string
	Topic      string
	GroupID    string
	MaxRetries int           // default 3
	Workers    int           // concurrent goroutines reading from the same reader; default 4
	MinBytes   int           // default 1 KB
	MaxBytes   int           // default 1 MB
	MaxWait    time.Duration // default 500ms
	// RetryBackoffBase is the base delay for exponential backoff between in-memory retries.
	// Actual delay = RetryBackoffBase * 2^(attempt-1). Default 200ms.
	RetryBackoffBase time.Duration
}

func (c *Config) setDefaults() {
	if c.MaxRetries <= 0 {
		c.MaxRetries = 3
	}
	if c.Workers <= 0 {
		c.Workers = 4
	}
	if c.MinBytes <= 0 {
		c.MinBytes = 1
	}
	if c.MaxBytes <= 0 {
		c.MaxBytes = 1 << 20 // 1 MB
	}
	if c.MaxWait <= 0 {
		c.MaxWait = 500 * time.Millisecond
	}
	if c.RetryBackoffBase <= 0 {
		c.RetryBackoffBase = 200 * time.Millisecond
	}
}

// Consumer is a single-topic, multi-worker Kafka consumer.
type Consumer struct {
	reader   *kafka.Reader
	dlq      *producer.Producer
	handler  Handler
	cfg      Config
	log      *slog.Logger
}

// New creates a Consumer. dlqProducer may be nil — if nil, failed messages are
// only logged (useful in tests). In production always provide a dlqProducer.
func New(cfg Config, dlqProducer *producer.Producer, handler Handler, log *slog.Logger) *Consumer {
	cfg.setDefaults()
	return &Consumer{
		reader: kafka.NewReader(kafka.ReaderConfig{
			Brokers:        cfg.Brokers,
			Topic:          cfg.Topic,
			GroupID:        cfg.GroupID,
			MinBytes:       cfg.MinBytes,
			MaxBytes:       cfg.MaxBytes,
			MaxWait:        cfg.MaxWait,
			CommitInterval: 0,                 // manual commit only
			StartOffset:    kafka.FirstOffset, // new group reads from beginning, not latest
		}),
		dlq:     dlqProducer,
		handler: handler,
		cfg:     cfg,
		log:     log,
	}
}

// Run starts the worker pool and blocks until ctx is cancelled.
// All workers share one kafka.Reader which handles partition assignment internally.
func (c *Consumer) Run(ctx context.Context) {
	done := make(chan struct{})
	for i := range c.cfg.Workers {
		go func(id int) {
			defer func() {
				if r := recover(); r != nil {
					c.log.Error("consumer worker panicked", "worker", id, "recover", r, "topic", c.cfg.Topic)
				}
			}()
			c.runWorker(ctx, id)
		}(i + 1)
	}
	<-ctx.Done()
	c.log.Info("kafka consumer shutting down", "topic", c.cfg.Topic)
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	_ = c.reader.Close()
	<-shutdownCtx.Done()
	close(done)
}

func (c *Consumer) runWorker(ctx context.Context, workerID int) {
	for {
		// FetchMessage does NOT auto-commit — we commit only on success.
		msg, err := c.reader.FetchMessage(ctx)
		if err != nil {
			if ctx.Err() != nil {
				return
			}
			c.log.Error("kafka fetch error", "worker", workerID, "topic", c.cfg.Topic, "err", err)
			time.Sleep(500 * time.Millisecond)
			continue
		}
		c.processMessage(ctx, workerID, msg)
	}
}

func (c *Consumer) processMessage(ctx context.Context, workerID int, msg kafka.Message) {
	// --- Unwrap envelope ---
	var env envelope.Envelope
	if err := json.Unmarshal(msg.Value, &env); err != nil {
		c.log.Error("invalid envelope payload", "worker", workerID, "topic", msg.Topic, "err", err)
		c.sendToDLQ(ctx, envelope.Envelope{Topic: msg.Topic}, msg.Value, "invalid_payload", err.Error())
		c.commitOrLog(ctx, msg)
		return
	}

	// --- Call handler with retry + exponential backoff ---
	var lastErr error
	for attempt := 1; attempt <= c.cfg.MaxRetries; attempt++ {
		env.Attempt = attempt
		if handlerErr := c.handler(ctx, env); handlerErr == nil {
			// Success — commit offset.
			c.commitOrLog(ctx, msg)
			return
		} else {
			lastErr = handlerErr
		}

		if attempt < c.cfg.MaxRetries {
			delay := backoff(c.cfg.RetryBackoffBase, attempt)
			c.log.Warn("kafka handler failed, retrying",
				"worker", workerID,
				"topic", msg.Topic,
				"event_id", env.EventID,
				"attempt", attempt,
				"next_delay", delay,
				"err", lastErr,
			)
			select {
			case <-ctx.Done():
				return
			case <-time.After(delay):
			}
		}
	}

	// --- Max retries exceeded → DLQ ---
	c.log.Error("kafka handler max retries exceeded, sending to DLQ",
		"worker", workerID,
		"topic", msg.Topic,
		"event_id", env.EventID,
		"attempts", c.cfg.MaxRetries,
		"err", lastErr,
	)
	errMsg := ""
	if lastErr != nil {
		errMsg = lastErr.Error()
	}
	c.sendToDLQ(ctx, env, nil, "max_retries_exceeded", errMsg)
	// Commit even on DLQ to prevent infinite reprocessing of a poison message.
	c.commitOrLog(ctx, msg)
}

func (c *Consumer) sendToDLQ(ctx context.Context, env envelope.Envelope, rawPayload []byte, reason, lastError string) {
	if c.dlq == nil {
		c.log.Warn("no DLQ producer configured, dropping message",
			"topic", env.Topic,
			"event_id", env.EventID,
			"reason", reason,
		)
		return
	}
	dead := envelope.DeadLetter{
		Envelope:   env,
		RawPayload: rawPayload,
		Reason:     reason,
		LastError:  lastError,
		FailedAt:   time.Now().UTC(),
	}
	dlqTopic := topics.DLQTopic(env.Topic)
	if err := c.dlq.PublishDLQ(ctx, dlqTopic, dead); err != nil {
		c.log.Error("failed to publish to DLQ",
			"dlq_topic", dlqTopic,
			"event_id", env.EventID,
			"err", fmt.Sprintf("%v", err),
		)
	}
}

func (c *Consumer) commitOrLog(ctx context.Context, msg kafka.Message) {
	if err := c.reader.CommitMessages(ctx, msg); err != nil {
		c.log.Error("kafka commit failed", "topic", msg.Topic, "offset", msg.Offset, "err", err)
	}
}

// Close releases the underlying reader. Run() already closes the reader on
// ctx cancellation; this is provided for explicit cleanup.
func (c *Consumer) Close() error {
	return c.reader.Close()
}

// backoff returns exponential delay: base * 2^(attempt-1), capped at 30s.
func backoff(base time.Duration, attempt int) time.Duration {
	d := time.Duration(float64(base) * math.Pow(2, float64(attempt-1)))
	if d > 30*time.Second {
		d = 30 * time.Second
	}
	return d
}

// Unmarshal is a convenience helper for decoding an envelope payload into a typed struct.
func Unmarshal[T any](env envelope.Envelope) (T, error) {
	var v T
	return v, json.Unmarshal(env.Payload, &v)
}
