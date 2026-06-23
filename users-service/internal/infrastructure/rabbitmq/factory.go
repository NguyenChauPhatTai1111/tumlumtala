package rabbitmq

import "github.com/rs/zerolog"

// NewDomainEventPublisher tạo publisher RabbitMQ cho domain events và tự log lỗi khởi tạo.
func NewDomainEventPublisher(cfg Config, log zerolog.Logger) *Publisher {
	conn, err := Dial(cfg)
	if err != nil {
		log.Error().Err(err).Msg("connect rabbitmq domain event publisher failed")
		return nil
	}

	publisher, err := NewPublisher(conn, cfg)
	if err != nil {
		_ = conn.Close()
		log.Error().Err(err).Msg("create rabbitmq domain event publisher failed")
		return nil
	}

	return publisher
}
