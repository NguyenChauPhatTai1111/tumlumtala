package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/go-sql-driver/mysql"
	"github.com/joho/godotenv"
)

type DatabaseConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	Name     string
}

func (c DatabaseConfig) DSN() string {
	config := mysql.Config{
		User:                 c.User,
		Passwd:               c.Password,
		Net:                  "tcp",
		Addr:                 c.Host + ":" + c.Port,
		DBName:               c.Name,
		ParseTime:            true,
		Loc:                  time.UTC,
		AllowNativePasswords: true,
	}
	return config.FormatDSN()
}

type Config struct {
	Database       DatabaseConfig
	KafkaBrokers   []string
	RabbitMQ       RabbitMQConfig
	Port           string
	CORSOrigin     string
	Environment    string
	AppVersion     string
	LogLevel       string
	LogOutput      string
	LogCaller      bool
	TracingEnabled bool
	OTLPEndpoint   string
}

type RabbitMQConfig struct {
	URL          string
	ExchangeName string
	ExchangeType string
}

func Load() (Config, error) {
	if err := godotenv.Load(); err != nil && !os.IsNotExist(err) {
		return Config{}, fmt.Errorf("load .env: %w", err)
	}
	cfg := Config{
		Database: DatabaseConfig{
			Host: env("DB_HOST", "localhost"), Port: env("DB_PORT", "3306"),
			User: env("DB_USER", "tumlum"), Password: env("DB_PASSWORD", "tala"), Name: env("DB_NAME", "tumlumtala_users"),
		},
		KafkaBrokers: strings.Split(env("KAFKA_BROKERS", "tumlumtala-kafka:9092"), ","),
		RabbitMQ:     RabbitMQConfig{URL: env("RABBITMQ_URL", "amqp://admin:admin@rabbitmq:5672/"), ExchangeName: env("RABBITMQ_DOMAIN_EXCHANGE", "domain.events"), ExchangeType: env("RABBITMQ_DOMAIN_EXCHANGE_TYPE", "topic")},
		Port:         env("PORT", "25052"), CORSOrigin: env("CORS_ORIGIN", "http://localhost:3000"),
		Environment:    env("APP_ENV", "local"),
		AppVersion:     env("APP_VERSION", "local"),
		LogLevel:       env("LOG_LEVEL", "INFO"),
		LogOutput:      env("LOG_OUTPUT", "json"),
		LogCaller:      envBool("LOG_CALLER", false),
		TracingEnabled: envBool("TRACING_ENABLED", true),
		OTLPEndpoint:   env("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4318"),
	}
	if err := validatePort("PORT", cfg.Port); err != nil {
		return Config{}, err
	}
	if err := validatePort("DB_PORT", cfg.Database.Port); err != nil {
		return Config{}, err
	}
	return cfg, nil
}

func env(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func validatePort(name, value string) error {
	port, err := strconv.Atoi(value)
	if err != nil || port < 1 || port > 65535 {
		return fmt.Errorf("%s must be between 1 and 65535", name)
	}
	return nil
}

func envBool(key string, fallback bool) bool {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	parsed, err := strconv.ParseBool(value)
	if err != nil {
		return fallback
	}
	return parsed
}
