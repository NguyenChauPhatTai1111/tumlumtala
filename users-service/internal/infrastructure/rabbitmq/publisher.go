package rabbitmq

import (
	"context"
	"encoding/json"
	"time"

	"github.com/google/uuid"
	amqp "github.com/rabbitmq/amqp091-go"
)

type EventPublisher interface {
	Publish(ctx context.Context, routingKey string, payload any) error
}

type Publisher struct {
	conn *amqp.Connection
	ch   *amqp.Channel
	cfg  Config
}

// NewPublisher tạo RabbitMQ publisher riêng cho domain events, tách biệt với Kafka publisher hiện có.
func NewPublisher(conn *amqp.Connection, cfg Config) (*Publisher, error) {
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

// Publish marshal payload JSON và publish message persistent theo chuẩn domain event.
func (p *Publisher) Publish(ctx context.Context, routingKey string, payload any) error {
	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	exchangeName := p.cfg.ExchangeName
	if exchangeName == "" {
		exchangeName = DefaultExchangeName
	}

	return p.ch.PublishWithContext(ctx, exchangeName, routingKey, false, false, amqp.Publishing{
		ContentType:  "application/json",
		DeliveryMode: amqp.Persistent,
		MessageId:    uuid.NewString(),
		Timestamp:    time.Now().UTC(),
		Type:         routingKey,
		Body:         body,
	})
}

// Close đóng channel và connection do RabbitMQ publisher đang giữ.
func (p *Publisher) Close() error {
	if p.ch != nil {
		_ = p.ch.Close()
	}
	if p.conn != nil {
		return p.conn.Close()
	}
	return nil
}
