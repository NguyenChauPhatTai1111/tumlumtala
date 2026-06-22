package config

import "tumlumtala/notification-service/utils"

type Config struct {
	App      AppConfig
	Log      LogConfig
	RabbitMQ RabbitMQConfig
	Redis    RedisConfig
	SMTP     SMTPConfig
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
			Host:     utils.GetEnv("RABBITMQ_HOST", "rabbitmq"),
			Port:     utils.GetEnvInt("RABBITMQ_PORT", 5672),
			User:     utils.GetEnv("RABBITMQ_USER", "admin"),
			Password: utils.GetEnv("RABBITMQ_PASSWORD", "admin"),
			VHost:    utils.GetEnv("RABBITMQ_VHOST", "/"),
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
		},
	}
}
