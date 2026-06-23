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


// Envelope = Business Payload + Metadata
// Notification + TraceID + RequestID + Attempt + PublishedAt
type Publisher struct {
	// RabbitMQ connection dùng chung toàn bộ publisher
	conn *amqp.Connection

	// Channel thực hiện publish message
	ch   *amqp.Channel

	// RabbitMQ topology config
	cfg  config.RabbitMQConfig
}

func NewPublisher(conn *amqp.Connection, cfg config.RabbitMQConfig) (*Publisher, error) {
	// Tạo channel publish riêng
	ch, err := conn.Channel()
	if err != nil {
		return nil, err
	}
	// Đảm bảo exchange, queue và binding đã tồn tại
	if err := DeclareTopology(ch, cfg); err != nil {
		_ = ch.Close()
		return nil, err
	}
	return &Publisher{conn: conn, ch: ch, cfg: cfg}, nil
}

func (p *Publisher) Publish(ctx context.Context, notification domain.Notification) error {
	// Bọc notification vào envelope để lưu metadata
	// như trace_id, request_id, attempt...
	envelope := p.newEnvelope(ctx, notification, 0)

	// Publish vào exchange chính
	return p.publishEnvelope(ctx, p.cfg.Exchange, p.cfg.RoutingKey, envelope, amqp.Table{})
}

func (p *Publisher) ReplayDLQ(ctx context.Context, limit int) (int, error) {
		// Giới hạn số lượng message replay mỗi lần
	if limit <= 0 {
		limit = 100
	}

	replayed := 0

	// Lấy message trực tiếp từ DLQ
	for replayed < limit {

		// Get là pull message thủ công thay vì consume liên tục
		delivery, ok, err := p.ch.Get(p.cfg.DLQQueue, false)
		if err != nil {
			return replayed, err
		}
		// Không còn message trong DLQ
		if !ok {
			return replayed, nil
		}

		var dead domain.DeadLetterMessage

		// Parse DLQ payload
		if err := json.Unmarshal(delivery.Body, &dead); err != nil {
			// Payload hỏng => loại bỏ luôn khỏi DLQ
			_ = delivery.Nack(false, false)
			return replayed, err
		}
		// Publish lại notification vào queue chính
		if err := p.Publish(ctx, dead.Notification); err != nil {
			// Publish thất bại => trả message về DLQ
			_ = delivery.Nack(false, true)
			return replayed, err
		}
		// Publish thành công => xóa message khỏi DLQ
		if err := delivery.Ack(false); err != nil {
			return replayed, err
		}
		replayed++
	}
	return replayed, nil
}

func (p *Publisher) PublishRetry(ctx context.Context, envelope domain.Envelope) error {
	// Cập nhật thời điểm publish lại
	envelope.PublishedAt = time.Now().UTC()

	// Đẩy message sang retry exchange/queue
	return p.publishEnvelope(ctx, p.cfg.RetryExchange, p.cfg.RetryRoutingKey, envelope, amqp.Table{
		"x-attempt": int32(envelope.Attempt),
	})
}

func (p *Publisher) PublishDLQ(ctx context.Context, dead domain.DeadLetterMessage) error {
	// Serialize DLQ message
	body, err := json.Marshal(dead)
	if err != nil {
		return err
	}

	// Gửi message sang Dead Letter Queue
	return p.ch.PublishWithContext(ctx, p.cfg.DLQExchange, p.cfg.DLQRoutingKey, false, false, amqp.Publishing{
		ContentType:  "application/json",

		// Lưu xuống disk để tránh mất message khi RabbitMQ restart
		DeliveryMode: amqp.Persistent,
		MessageId:    dead.ID,
		Timestamp:    time.Now().UTC(),

		// Metadata phục vụ debugging
		Headers: amqp.Table{
			"x-attempt":     int32(dead.Attempt),
			"x-max-retries": int32(dead.MaxRetries),
			"x-reason":      dead.Reason,
		},
		Body: body,
	})
}

func (p *Publisher) newEnvelope(ctx context.Context, notification domain.Notification, attempt int) domain.Envelope {

	// Đóng gói notification cùng metadata phục vụ tracing
	return domain.Envelope{
		Notification: notification,
		Attempt:      attempt,
		TraceID:      contextx.TraceID(ctx),
		RequestID:    contextx.RequestID(ctx),
		PublishedAt:  time.Now().UTC(),
	}
}

func (p *Publisher) publishEnvelope(ctx context.Context, exchange, routingKey string, envelope domain.Envelope, headers amqp.Table) error {

	// Serialize envelope thành JSON
	body, err := json.Marshal(envelope)
	if err != nil {
		return err
	}

	// Publish message tới RabbitMQ
	return p.ch.PublishWithContext(ctx, exchange, routingKey, false, false, amqp.Publishing{
		ContentType:  "application/json",
		// Persistent message để survive broker restart
		DeliveryMode: amqp.Persistent,
		MessageId:    envelope.Notification.ID,
		Timestamp:    time.Now().UTC(),
		Headers:      headers,
		Body:         body,
	})
}

func (p *Publisher) Close() error {

		// Đóng channel trước
	if p.ch != nil {
		_ = p.ch.Close()
	}
		// Sau đó đóng connection
	if p.conn != nil {
		return p.conn.Close()
	}
	return nil
}
