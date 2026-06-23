package rabbitmq

import (
	"fmt"

	amqp "github.com/rabbitmq/amqp091-go"
)

// Dial mở connection RabbitMQ từ URL để publisher có thể dùng chung một kết nối.
func Dial(cfg Config) (*amqp.Connection, error) {
	if cfg.URL == "" {
		return nil, fmt.Errorf("rabbitmq url is required")
	}
	return amqp.Dial(cfg.URL)
}

// DeclareTopology đảm bảo domain-event exchange tồn tại trước khi publish.
func DeclareTopology(ch *amqp.Channel, cfg Config) error {
	exchangeName := cfg.ExchangeName
	if exchangeName == "" {
		exchangeName = DefaultExchangeName
	}
	exchangeType := cfg.ExchangeType
	if exchangeType == "" {
		exchangeType = DefaultExchangeType
	}
	return ch.ExchangeDeclare(exchangeName, exchangeType, true, false, false, false, nil)
}
