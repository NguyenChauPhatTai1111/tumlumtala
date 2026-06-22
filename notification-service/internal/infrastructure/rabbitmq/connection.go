package rabbitmq

import (
	"fmt"
	"net/url"

	"tumlumtala/notification-service/internal/config"

	amqp "github.com/rabbitmq/amqp091-go"
)

func Dial(cfg config.RabbitMQConfig) (*amqp.Connection, error) {
	vhost := cfg.VHost
	if vhost == "" {
		vhost = "/"
	}

	u := url.URL{
		Scheme: "amqp",
		User:   url.UserPassword(cfg.User, cfg.Password),
		Host:   fmt.Sprintf("%s:%d", cfg.Host, cfg.Port),
		Path:   "/" + url.PathEscape(vhost),
	}
	return amqp.Dial(u.String())
}

func DeclareTopology(ch *amqp.Channel, cfg config.RabbitMQConfig) error {
	if err := ch.ExchangeDeclare(cfg.Exchange, "direct", true, false, false, false, nil); err != nil {
		return err
	}
	if err := ch.ExchangeDeclare(cfg.RetryExchange, "direct", true, false, false, false, nil); err != nil {
		return err
	}
	if err := ch.ExchangeDeclare(cfg.DLQExchange, "direct", true, false, false, false, nil); err != nil {
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

	if _, err := ch.QueueDeclare(cfg.DLQQueue, true, false, false, false, nil); err != nil {
		return err
	}
	return ch.QueueBind(cfg.DLQQueue, cfg.DLQRoutingKey, cfg.DLQExchange, false, nil)
}
