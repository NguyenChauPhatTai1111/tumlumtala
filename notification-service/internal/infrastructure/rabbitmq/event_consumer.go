package rabbitmq

import (
	"context"
	"errors"
	"sync"

	"tumlumtala/notification-service/internal/config"
	"tumlumtala/notification-service/internal/modules/notification/handler/eventhandler"

	amqp "github.com/rabbitmq/amqp091-go"
	"github.com/rs/zerolog"
)

type EventConsumer struct {
	conn    *amqp.Connection
	ch      *amqp.Channel
	cfg     config.RabbitMQConfig
	handler eventhandler.EventHandler
	log     zerolog.Logger
}

// NewEventConsumer khai báo exchange/queue/binding riêng cho domain events của notification worker.
func NewEventConsumer(conn *amqp.Connection, cfg config.RabbitMQConfig, handler eventhandler.EventHandler, log zerolog.Logger) (*EventConsumer, error) {
	ch, err := conn.Channel()
	if err != nil {
		return nil, err
	}
	if err := DeclareEventTopology(ch, cfg); err != nil {
		_ = ch.Close()
		return nil, err
	}
	if err := ch.Qos(eventPrefetch(cfg), 0, false); err != nil {
		_ = ch.Close()
		return nil, err
	}
	return &EventConsumer{conn: conn, ch: ch, cfg: cfg, handler: handler, log: log}, nil
}

// Run consume queue domain events bằng manual ack để lỗi handler được đưa vào DLQ.
func (c *EventConsumer) Run(ctx context.Context) error {
	deliveries, err := c.ch.Consume(c.cfg.EventQueue, "notification-event-worker", false, false, false, false, nil)
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
	_ = c.ch.Cancel("notification-event-worker", false)
	wg.Wait()
	return ctx.Err()
}

func (c *EventConsumer) runWorker(ctx context.Context, workerID int, deliveries <-chan amqp.Delivery) {
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

// handleDelivery chuyển RabbitMQ delivery sang event handler rồi ack/nack theo kết quả xử lý.
func (c *EventConsumer) handleDelivery(ctx context.Context, workerID int, delivery amqp.Delivery) {
	if err := c.handler.Handle(ctx, delivery.RoutingKey, delivery.Body); err != nil {
		c.log.Error().
			Err(err).
			Int("worker_id", workerID).
			Str("routing_key", delivery.RoutingKey).
			Msg("domain event handler failed")

		if errors.Is(err, eventhandler.ErrInvalidPayload) {
			_ = delivery.Nack(false, false)
			return
		}

		_ = delivery.Nack(false, false)
		return
	}

	c.log.Info().
		Int("worker_id", workerID).
		Str("routing_key", delivery.RoutingKey).
		Msg("domain event handled")
	_ = delivery.Ack(false)
}

func (c *EventConsumer) Close() error {
	if c.ch != nil {
		_ = c.ch.Close()
	}
	if c.conn != nil {
		return c.conn.Close()
	}
	return nil
}

func eventPrefetch(cfg config.RabbitMQConfig) int {
	if cfg.EventPrefetch > 0 {
		return cfg.EventPrefetch
	}
	if cfg.Prefetch > 0 {
		return cfg.Prefetch
	}
	return 16
}
