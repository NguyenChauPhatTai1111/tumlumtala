package rabbitmq

import (
	"context"
	"encoding/json"
	"sync"
	"time"

	"tumlumtala/notification-service/internal/config"
	"tumlumtala/notification-service/internal/modules/notification/domain"
	"tumlumtala/notification-service/internal/modules/notification/worker/processor"

	amqp "github.com/rabbitmq/amqp091-go"
	"github.com/rs/zerolog"
)

type Consumer struct {
	conn      *amqp.Connection
	ch        *amqp.Channel
	cfg       config.RabbitMQConfig
	publisher *Publisher
	processor *processor.NotificationProcessor
	log       zerolog.Logger
}

func NewConsumer(conn *amqp.Connection, cfg config.RabbitMQConfig, publisher *Publisher, processor *processor.NotificationProcessor, log zerolog.Logger) (*Consumer, error) {
	ch, err := conn.Channel()
	if err != nil {
		return nil, err
	}
	if err := DeclareTopology(ch, cfg); err != nil {
		_ = ch.Close()
		return nil, err
	}
	if err := ch.Qos(cfg.Prefetch, 0, false); err != nil {
		_ = ch.Close()
		return nil, err
	}
	return &Consumer{conn: conn, ch: ch, cfg: cfg, publisher: publisher, processor: processor, log: log}, nil
}

func (c *Consumer) Run(ctx context.Context) error {
	deliveries, err := c.ch.Consume(c.cfg.Queue, "notification-worker", false, false, false, false, nil)
	if err != nil {
		return err
	}

	workers := c.cfg.Workers
	if workers <= 0 {
		workers = 1
	}

	var wg sync.WaitGroup
	for i := 0; i < workers; i++ {
		wg.Add(1)
		go func(workerID int) {
			defer wg.Done()
			c.runWorker(ctx, workerID, deliveries)
		}(i + 1)
	}

	<-ctx.Done()
	_ = c.ch.Cancel("notification-worker", false)
	wg.Wait()
	return ctx.Err()
}

func (c *Consumer) runWorker(ctx context.Context, workerID int, deliveries <-chan amqp.Delivery) {
	for {
		select {
		case <-ctx.Done():
			return
		case delivery, ok := <-deliveries:
			if !ok {
				return
			}
			c.handleDelivery(ctx, workerID, delivery)
		}
	}
}

func (c *Consumer) handleDelivery(ctx context.Context, workerID int, delivery amqp.Delivery) {
	var envelope domain.Envelope
	if err := json.Unmarshal(delivery.Body, &envelope); err != nil {
		c.log.Error().Err(err).Int("worker_id", workerID).Msg("invalid notification payload")
		c.moveInvalidPayloadToDLQ(ctx, delivery, err)
		return
	}

	err := c.processor.Process(ctx, envelope.Notification)
	if err == nil {
		c.log.Info().
			Int("worker_id", workerID).
			Str("notification_id", envelope.Notification.ID).
			Str("channel", envelope.Notification.Channel.String()).
			Msg("notification processed")
		_ = delivery.Ack(false)
		return
	}

	nextAttempt := envelope.Attempt + 1
	if nextAttempt > c.cfg.MaxRetries {
		c.moveToDLQ(ctx, delivery, envelope, nextAttempt, err)
		return
	}

	envelope.Attempt = nextAttempt
	if envelope.Headers == nil {
		envelope.Headers = map[string]string{}
	}
	envelope.Headers["last_error"] = err.Error()

	if pubErr := c.publisher.PublishRetry(ctx, envelope); pubErr != nil {
		c.log.Error().Err(pubErr).Str("notification_id", envelope.Notification.ID).Msg("publish retry failed")
		_ = delivery.Nack(false, true)
		return
	}

	c.log.Warn().
		Err(err).
		Int("worker_id", workerID).
		Int("attempt", nextAttempt).
		Str("notification_id", envelope.Notification.ID).
		Msg("notification scheduled for retry")
	_ = delivery.Ack(false)
}

func (c *Consumer) moveInvalidPayloadToDLQ(ctx context.Context, delivery amqp.Delivery, cause error) {
	id := delivery.MessageId
	if id == "" {
		id = "invalid-" + time.Now().UTC().Format("20060102150405.000000000")
	}

	dead := domain.DeadLetterMessage{
		ID:         id,
		RawPayload: delivery.Body,
		Attempt:    0,
		MaxRetries: c.cfg.MaxRetries,
		Reason:     "invalid_payload",
		LastError:  cause.Error(),
		FailedAt:   time.Now().UTC(),
		Metadata: map[string]string{
			"source_exchange":   delivery.Exchange,
			"source_routingKey": delivery.RoutingKey,
		},
	}

	if pubErr := c.publisher.PublishDLQ(ctx, dead); pubErr != nil {
		c.log.Error().Err(pubErr).Str("message_id", id).Msg("publish invalid payload dlq failed")
		_ = delivery.Nack(false, true)
		return
	}

	_ = delivery.Ack(false)
}

func (c *Consumer) moveToDLQ(ctx context.Context, delivery amqp.Delivery, envelope domain.Envelope, attempt int, cause error) {
	dead := domain.DeadLetterMessage{
		ID:           envelope.Notification.ID,
		Notification: envelope.Notification,
		Attempt:      attempt,
		MaxRetries:   c.cfg.MaxRetries,
		Reason:       "max_retries_exceeded",
		LastError:    cause.Error(),
		FailedAt:     time.Now().UTC(),
		TraceID:      envelope.TraceID,
		RequestID:    envelope.RequestID,
		Metadata: map[string]string{
			"source_exchange":   delivery.Exchange,
			"source_routingKey": delivery.RoutingKey,
		},
	}

	if pubErr := c.publisher.PublishDLQ(ctx, dead); pubErr != nil {
		c.log.Error().Err(pubErr).Str("notification_id", envelope.Notification.ID).Msg("publish dlq failed")
		_ = delivery.Nack(false, true)
		return
	}

	c.log.Error().
		Err(cause).
		Int("attempt", attempt).
		Str("notification_id", envelope.Notification.ID).
		Msg("notification moved to dlq")
	_ = delivery.Ack(false)
}

func (c *Consumer) Close() error {
	if c.ch != nil {
		_ = c.ch.Close()
	}
	if c.conn != nil {
		return c.conn.Close()
	}
	return nil
}

func ShutdownContext(parent context.Context) (context.Context, context.CancelFunc) {
	return context.WithTimeout(parent, 15*time.Second)
}
