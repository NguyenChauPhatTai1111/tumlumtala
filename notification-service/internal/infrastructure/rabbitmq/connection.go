package rabbitmq

import (
	"fmt"
	"net/url"

	"tumlumtala/notification-service/internal/config"

	amqp "github.com/rabbitmq/amqp091-go"
)

func Dial(cfg config.RabbitMQConfig) (*amqp.Connection, error) {

	// RabbitMQ mặc định sử dụng root vhost "/"
	vhost := cfg.VHost
	if vhost == "" {
		vhost = "/"
	}

	// Build AMQP connection string:
	// amqp://user:password@host:port/vhost
	u := url.URL{
		Scheme: "amqp",
		User:   url.UserPassword(cfg.User, cfg.Password),
		Host:   fmt.Sprintf("%s:%d", cfg.Host, cfg.Port),
		Path:   "/" + url.PathEscape(vhost),
	}

	// Mở TCP connection tới RabbitMQ broker
	return amqp.Dial(u.String())
}

// DeclareTopology đảm bảo toàn bộ RabbitMQ topology tồn tại.
//
// Kiến trúc:
//
// Producer
//    |
//    v
// Main Exchange
//    |
//    v
// Main Queue
//    |
// Consumer Process
//    |
//    +--> Success -> Ack
//    |
//    +--> Retry -> Retry Exchange -> Retry Queue (TTL)
//    |                                   |
//    |                                   v
//    +--------------------------- Dead Letter
//                                        |
//                                        v
//                                  Main Exchange
//
//    +--> Max Retry -> DLQ Exchange -> DLQ Queue
//

func DeclareTopology(ch *amqp.Channel, cfg config.RabbitMQConfig) error {
	// Exchange chính nhận notification mới
	if err := ch.ExchangeDeclare(cfg.Exchange, "direct", true, false, false, false, nil); err != nil {
		return err
	}
	// Exchange dùng cho retry message
	if err := ch.ExchangeDeclare(cfg.RetryExchange, "direct", true, false, false, false, nil); err != nil {
		return err
	}
	// Exchange chứa các message không thể xử lý được
	if err := ch.ExchangeDeclare(cfg.DLQExchange, "direct", true, false, false, false, nil); err != nil {
		return err
	}
	// Queue chính chứa notification cần xử lý
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
	//
	retryArgs := amqp.Table{
		"x-message-ttl":             int32(cfg.RetryDelayMs),
		// Sau khi TTL hết hạn
		// message sẽ được gửi về exchange chính
		"x-dead-letter-exchange":    cfg.Exchange,
		// Routing key khi quay về queue chính
		"x-dead-letter-routing-key": cfg.RoutingKey,
	}

	// Queue delay dùng cho retry
	if _, err := ch.QueueDeclare(cfg.RetryQueue, true, false, false, false, retryArgs); err != nil {
		return err
	}

	// Consumer publish retry vào:
	//
	// Retry Exchange
	//      |
	//      v
	// Retry Queue
	//
	if err := ch.QueueBind(cfg.RetryQueue, cfg.RetryRoutingKey, cfg.RetryExchange, false, nil); err != nil {
		return err
	}
	// Queue lưu các message vượt quá số lần retry cho phép
	if _, err := ch.QueueDeclare(cfg.DLQQueue, true, false, false, false, nil); err != nil {
		return err
	}
	// Bind DLQ Exchange -> DLQ Queue
	return ch.QueueBind(cfg.DLQQueue, cfg.DLQRoutingKey, cfg.DLQExchange, false, nil)
}
