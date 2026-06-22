package rabbitmq

import (
	"context"
	"encoding/json"
	"time"

	"tumlumtala/notification-service/internal/config"
	"tumlumtala/notification-service/internal/modules/notification/domain"
	contextx "tumlumtala/notification-service/internal/shared/context"

	amqp "github.com/rabbitmq/amqp091-go"
)

type Publisher struct {
	conn *amqp.Connection
	ch   *amqp.Channel
	cfg  config.RabbitMQConfig
}

func NewPublisher(conn *amqp.Connection, cfg config.RabbitMQConfig) (*Publisher, error) {
	ch, err := conn.Channel()
	if err != nil {
		return nil, err
	}
	if err := DeclareTopology(ch, cfg); err != nil {
		_ = ch.Close()
		return nil, err
	}
	return &Publisher{conn: conn, ch: ch, cfg: cfg}, nil
}

func (p *Publisher) Publish(ctx context.Context, notification domain.Notification) error {
	envelope := p.newEnvelope(ctx, notification, 0)
	return p.publishEnvelope(ctx, p.cfg.Exchange, p.cfg.RoutingKey, envelope, amqp.Table{})
}

func (p *Publisher) ReplayDLQ(ctx context.Context, limit int) (int, error) {
	if limit <= 0 {
		limit = 100
	}

	replayed := 0
	for replayed < limit {
		delivery, ok, err := p.ch.Get(p.cfg.DLQQueue, false)
		if err != nil {
			return replayed, err
		}
		if !ok {
			return replayed, nil
		}

		var dead domain.DeadLetterMessage
		if err := json.Unmarshal(delivery.Body, &dead); err != nil {
			_ = delivery.Nack(false, false)
			return replayed, err
		}

		if err := p.Publish(ctx, dead.Notification); err != nil {
			_ = delivery.Nack(false, true)
			return replayed, err
		}

		if err := delivery.Ack(false); err != nil {
			return replayed, err
		}
		replayed++
	}
	return replayed, nil
}

func (p *Publisher) PublishRetry(ctx context.Context, envelope domain.Envelope) error {
	envelope.PublishedAt = time.Now().UTC()
	return p.publishEnvelope(ctx, p.cfg.RetryExchange, p.cfg.RetryRoutingKey, envelope, amqp.Table{
		"x-attempt": int32(envelope.Attempt),
	})
}

func (p *Publisher) PublishDLQ(ctx context.Context, dead domain.DeadLetterMessage) error {
	body, err := json.Marshal(dead)
	if err != nil {
		return err
	}

	return p.ch.PublishWithContext(ctx, p.cfg.DLQExchange, p.cfg.DLQRoutingKey, false, false, amqp.Publishing{
		ContentType:  "application/json",
		DeliveryMode: amqp.Persistent,
		MessageId:    dead.ID,
		Timestamp:    time.Now().UTC(),
		Headers: amqp.Table{
			"x-attempt":     int32(dead.Attempt),
			"x-max-retries": int32(dead.MaxRetries),
			"x-reason":      dead.Reason,
		},
		Body: body,
	})
}

func (p *Publisher) newEnvelope(ctx context.Context, notification domain.Notification, attempt int) domain.Envelope {
	return domain.Envelope{
		Notification: notification,
		Attempt:      attempt,
		TraceID:      contextx.TraceID(ctx),
		RequestID:    contextx.RequestID(ctx),
		PublishedAt:  time.Now().UTC(),
	}
}

func (p *Publisher) publishEnvelope(ctx context.Context, exchange, routingKey string, envelope domain.Envelope, headers amqp.Table) error {
	body, err := json.Marshal(envelope)
	if err != nil {
		return err
	}

	return p.ch.PublishWithContext(ctx, exchange, routingKey, false, false, amqp.Publishing{
		ContentType:  "application/json",
		DeliveryMode: amqp.Persistent,
		MessageId:    envelope.Notification.ID,
		Timestamp:    time.Now().UTC(),
		Headers:      headers,
		Body:         body,
	})
}

func (p *Publisher) Close() error {
	if p.ch != nil {
		_ = p.ch.Close()
	}
	if p.conn != nil {
		return p.conn.Close()
	}
	return nil
}
