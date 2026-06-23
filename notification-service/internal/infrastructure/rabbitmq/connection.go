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
	vhost := cfg.VHost
	if vhost == "" {
		vhost = "/"
	}

	userInfo := url.UserPassword(cfg.User, cfg.Password).String()
	host := fmt.Sprintf("%s:%d", cfg.Host, cfg.Port)
	return amqp.Dial(fmt.Sprintf("amqp://%s@%s/%s", userInfo, host, url.PathEscape(vhost)))
}

func DeclareTopology(ch *amqp.Channel, cfg config.RabbitMQConfig) error {
	commandDLQ := DeadLetterTopology{
		Exchange:   cfg.DLQExchange,
		Queue:      cfg.DLQQueue,
		RoutingKey: cfg.DLQRoutingKey,
	}

	if err := ch.ExchangeDeclare(cfg.Exchange, "direct", true, false, false, false, nil); err != nil {
		return err
	}
	if err := ch.ExchangeDeclare(cfg.RetryExchange, "direct", true, false, false, false, nil); err != nil {
		return err
	}
	if err := DeclareDeadLetterTopology(ch, commandDLQ); err != nil {
		return err
	}

	if _, err := ch.QueueDeclare(cfg.Queue, true, false, false, false, nil); err != nil {
		return err
	}
	if err := ch.QueueBind(cfg.Queue, cfg.RoutingKey, cfg.Exchange, false, nil); err != nil {
		return err
	}

	retryArgs := amqp.Table{
		"x-message-ttl":             int32(cfg.RetryDelayMs),
		"x-dead-letter-exchange":    cfg.Exchange,
		"x-dead-letter-routing-key": cfg.RoutingKey,
	}
	if _, err := ch.QueueDeclare(cfg.RetryQueue, true, false, false, false, retryArgs); err != nil {
		return err
	}
	if err := ch.QueueBind(cfg.RetryQueue, cfg.RetryRoutingKey, cfg.RetryExchange, false, nil); err != nil {
		return err
	}

	return nil
}

func DeclareEventTopology(ch *amqp.Channel, cfg config.RabbitMQConfig) error {
	eventDLQ := DeadLetterTopology{
		Exchange:   cfg.EventDLQExchange,
		Queue:      cfg.EventDLQQueue,
		RoutingKey: cfg.EventDLQRoutingKey,
	}

	if err := ch.ExchangeDeclare(cfg.EventExchange, "topic", true, false, false, false, nil); err != nil {
		return err
	}
	if err := DeclareDeadLetterTopology(ch, eventDLQ); err != nil {
		return err
	}

	// Event queue dùng DLQ riêng vì body là domain event, khác schema với notification command envelope.
	if _, err := ch.QueueDeclare(cfg.EventQueue, true, false, false, false, deadLetterArgs(eventDLQ)); err != nil {
		return err
	}
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
	if err := ch.ExchangeDeclare(dlq.Exchange, "direct", true, false, false, false, nil); err != nil {
		return err
	}
	if _, err := ch.QueueDeclare(dlq.Queue, true, false, false, false, nil); err != nil {
		return err
	}
	return ch.QueueBind(dlq.Queue, dlq.RoutingKey, dlq.Exchange, false, nil)
}

func deadLetterArgs(dlq DeadLetterTopology) amqp.Table {
	return amqp.Table{
		"x-dead-letter-exchange":    dlq.Exchange,
		"x-dead-letter-routing-key": dlq.RoutingKey,
	}
}
