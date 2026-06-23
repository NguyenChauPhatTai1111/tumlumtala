package config

import "tumlumtala/notification-service/utils"

type Config struct {
	App      AppConfig
	Log      LogConfig
	RabbitMQ RabbitMQConfig
	Redis    RedisConfig
	SMTP     SMTPConfig
	Zalo     ZaloConfig
}

func Load() Config {
	return Config{
		App: AppConfig{
			Name: utils.GetEnv("APP_NAME", "notification-service"),
			Env:  utils.GetEnv("APP_ENV", "local"),
			Port: utils.GetEnvInt("APP_PORT", 8888),
		},

		Log: LogConfig{
			Level: utils.GetEnv("LOG_LEVEL", "info"),
			JSON:  utils.GetEnvBool("LOG_JSON", true),
		},

		RabbitMQ: RabbitMQConfig{
			Host:          utils.GetEnv("RABBITMQ_HOST", "rabbitmq"),
			Port:          utils.GetEnvInt("RABBITMQ_PORT", 5672),
			User:          utils.GetEnv("RABBITMQ_USER", "admin"),
			Password:      utils.GetEnv("RABBITMQ_PASSWORD", "admin"),
			VHost:         utils.GetEnv("RABBITMQ_VHOST", "/"),
			Exchange:      utils.GetEnv("RABBITMQ_EXCHANGE", "notification.exchange"),
			Queue:         utils.GetEnv("RABBITMQ_QUEUE", "notification.send"),
			RoutingKey:    utils.GetEnv("RABBITMQ_ROUTING_KEY", "notification.send"),
			EventExchange: utils.GetEnv("RABBITMQ_EVENT_EXCHANGE", "domain.events"),
			EventQueue:    utils.GetEnv("RABBITMQ_EVENT_QUEUE", "notification.events.queue"),
			EventRoutingKeys: []string{
				utils.GetEnv("RABBITMQ_EVENT_ROUTING_KEY", "user.created"),
			},
			EventPrefetch:      utils.GetEnvInt("RABBITMQ_EVENT_PREFETCH", 16),
			EventDLQExchange:   utils.GetEnv("RABBITMQ_EVENT_DLQ_EXCHANGE", "notification.events.dlq.exchange"),
			EventDLQQueue:      utils.GetEnv("RABBITMQ_EVENT_DLQ_QUEUE", "notification.events.dlq"),
			EventDLQRoutingKey: utils.GetEnv("RABBITMQ_EVENT_DLQ_ROUTING_KEY", "notification.events.dlq"),
			RetryExchange:      utils.GetEnv("RABBITMQ_RETRY_EXCHANGE", "notification.retry.exchange"),
			RetryQueue:         utils.GetEnv("RABBITMQ_RETRY_QUEUE", "notification.retry"),
			RetryRoutingKey:    utils.GetEnv("RABBITMQ_RETRY_ROUTING_KEY", "notification.retry"),
			DLQExchange:        utils.GetEnv("RABBITMQ_DLQ_EXCHANGE", "notification.dlq.exchange"),
			DLQQueue:           utils.GetEnv("RABBITMQ_DLQ_QUEUE", "notification.dlq"),
			DLQRoutingKey:      utils.GetEnv("RABBITMQ_DLQ_ROUTING_KEY", "notification.dlq"),
			Prefetch:           utils.GetEnvInt("RABBITMQ_PREFETCH", 16),
			Workers:            utils.GetEnvInt("NOTIFICATION_WORKERS", 4),
			MaxRetries:         utils.GetEnvInt("NOTIFICATION_MAX_RETRIES", 3),
			RetryDelayMs:       utils.GetEnvInt("NOTIFICATION_RETRY_DELAY_MS", 30000),
		},

		Redis: RedisConfig{
			Host:     utils.GetEnv("REDIS_HOST", "redis"),
			Port:     utils.GetEnvInt("REDIS_PORT", 6379),
			Password: utils.GetEnv("REDIS_PASSWORD", ""),
			DB:       utils.GetEnvInt("REDIS_DB", 0),
		},

		SMTP: SMTPConfig{
			Host:     utils.GetEnv("SMTP_HOST", ""),
			Port:     utils.GetEnvInt("SMTP_PORT", 587),
			Username: utils.GetEnv("SMTP_USERNAME", ""),
			Password: utils.GetEnv("SMTP_PASSWORD", ""),
			From:     utils.GetEnv("SMTP_FROM", ""),
			FromName: utils.GetEnv("SMTP_FROM_NAME", "Tumlumtala"),
			APIKey:   utils.GetEnv("BREVO_API_KEY", ""),
			APIURL:   utils.GetEnv("BREVO_API_URL", "https://api.brevo.com/v3/smtp/email"),
		},

		Zalo: ZaloConfig{
			Endpoint: utils.GetEnv("ZALO_ENDPOINT", ""),
			Token:    utils.GetEnv("ZALO_TOKEN", ""),
		},
	}
}
