package rabbitmq

import (
	"fmt"
	"net/url"

	"tumlumtala/notification-service/internal/config"

	amqp "github.com/rabbitmq/amqp091-go"
)

type DeadLetterTopology struct {
	Exchange   string
	Queue      string
	RoutingKey string
}

func Dial(cfg config.RabbitMQConfig) (*amqp.Connection, error) {
	// RabbitMQ mặc định sử dụng root vhost "/".
	vhost := cfg.VHost
	if vhost == "" {
		vhost = "/"
	}

	// Build AMQP connection string:
	// amqp://user:password@host:port/vhost
	//
	// Lưu ý: url.URL với Path "/" + url.PathEscape("/") sẽ double-escape root vhost
	// thành %252F, RabbitMQ hiểu sai vhost và trả 403. Vì vậy build string thủ công
	// để vhost chỉ được escape đúng một lần.
	userInfo := url.UserPassword(cfg.User, cfg.Password).String()
	host := fmt.Sprintf("%s:%d", cfg.Host, cfg.Port)
	return amqp.Dial(fmt.Sprintf("amqp://%s@%s/%s", userInfo, host, url.PathEscape(vhost)))
}

// DeclareTopology đảm bảo toàn bộ RabbitMQ topology tồn tại.
//
// Kiến trúc command queue:
//
// Producer
//
//	|
//	v
//
// Main Exchange
//
//	|
//	v
//
// Main Queue
//
//	|
//
// Consumer Process
//
//	|
//	+--> Success -> Ack
//	|
//	+--> Retry -> Retry Exchange -> Retry Queue (TTL)
//	|                                   |
//	|                                   v
//	+--------------------------- Dead Letter
//	                                    |
//	                                    v
//	                              Main Exchange
//
//	+--> Max Retry -> DLQ Exchange -> DLQ Queue
func DeclareTopology(ch *amqp.Channel, cfg config.RabbitMQConfig) error {
	commandDLQ := DeadLetterTopology{
		Exchange:   cfg.DLQExchange,
		Queue:      cfg.DLQQueue,
		RoutingKey: cfg.DLQRoutingKey,
	}

	// Exchange chính nhận notification mới.
	if err := ch.ExchangeDeclare(cfg.Exchange, "direct", true, false, false, false, nil); err != nil {
		return err
	}

	// Exchange dùng cho retry message.
	if err := ch.ExchangeDeclare(cfg.RetryExchange, "direct", true, false, false, false, nil); err != nil {
		return err
	}

	// DLQ command dùng helper chung, nhưng queue vật lý tách riêng với event DLQ.
	if err := DeclareDeadLetterTopology(ch, commandDLQ); err != nil {
		return err
	}

	// Queue chính chứa notification command cần xử lý.
	if _, err := ch.QueueDeclare(cfg.Queue, true, false, false, false, nil); err != nil {
		return err
	}

	// Bind routing key chính:
	// Producer -> Exchange -> Main Queue
	if err := ch.QueueBind(cfg.Queue, cfg.RoutingKey, cfg.Exchange, false, nil); err != nil {
		return err
	}

	// Retry Queue hoạt động như delay queue.
	//
	// Message được đưa vào retry queue sẽ:
	//
	// 1. Nằm trong queue RetryDelayMs milliseconds
	// 2. Hết TTL
	// 3. RabbitMQ tự động dead-letter
	// 4. Chuyển về Main Exchange
	// 5. Quay lại Main Queue để xử lý lần tiếp theo
	retryArgs := amqp.Table{
		"x-message-ttl": int32(cfg.RetryDelayMs),

		// Sau khi TTL hết hạn, message sẽ được gửi về exchange chính.
		"x-dead-letter-exchange": cfg.Exchange,

		// Routing key khi quay về queue chính.
		"x-dead-letter-routing-key": cfg.RoutingKey,
	}

	// Queue delay dùng cho retry.
	if _, err := ch.QueueDeclare(cfg.RetryQueue, true, false, false, false, retryArgs); err != nil {
		return err
	}

	// Consumer publish retry vào:
	//
	// Retry Exchange
	//      |
	//      v
	// Retry Queue
	if err := ch.QueueBind(cfg.RetryQueue, cfg.RetryRoutingKey, cfg.RetryExchange, false, nil); err != nil {
		return err
	}

	return nil
}

// DeclareEventTopology khai báo topic exchange, queue và DLQ riêng cho domain events.
func DeclareEventTopology(ch *amqp.Channel, cfg config.RabbitMQConfig) error {
	eventDLQ := DeadLetterTopology{
		Exchange:   cfg.EventDLQExchange,
		Queue:      cfg.EventDLQQueue,
		RoutingKey: cfg.EventDLQRoutingKey,
	}

	// Exchange domain event dùng topic để bind nhiều routing key như user.created/order.created.
	if err := ch.ExchangeDeclare(cfg.EventExchange, "topic", true, false, false, false, nil); err != nil {
		return err
	}

	// Event DLQ dùng chung helper với command DLQ, nhưng queue vật lý tách riêng vì schema payload khác.
	if err := DeclareDeadLetterTopology(ch, eventDLQ); err != nil {
		return err
	}

	// Event queue dùng DLQ riêng vì body là domain event, khác schema với notification command envelope.
	if _, err := ch.QueueDeclare(cfg.EventQueue, true, false, false, false, deadLetterArgs(eventDLQ)); err != nil {
		return err
	}

	// Bind từng routing key event mà notification-service quan tâm.
	for _, routingKey := range cfg.EventRoutingKeys {
		if routingKey == "" {
			continue
		}
		if err := ch.QueueBind(cfg.EventQueue, routingKey, cfg.EventExchange, false, nil); err != nil {
			return err
		}
	}
	return nil
}

func DeclareDeadLetterTopology(ch *amqp.Channel, dlq DeadLetterTopology) error {
	// Exchange chứa các message không thể xử lý được.
	if err := ch.ExchangeDeclare(dlq.Exchange, "direct", true, false, false, false, nil); err != nil {
		return err
	}

	// Queue lưu các message lỗi để replay/debug thủ công.
	if _, err := ch.QueueDeclare(dlq.Queue, true, false, false, false, nil); err != nil {
		return err
	}

	// Bind DLQ Exchange -> DLQ Queue.
	return ch.QueueBind(dlq.Queue, dlq.RoutingKey, dlq.Exchange, false, nil)
}

func deadLetterArgs(dlq DeadLetterTopology) amqp.Table {
	return amqp.Table{
		"x-dead-letter-exchange":    dlq.Exchange,
		"x-dead-letter-routing-key": dlq.RoutingKey,
	}
}
