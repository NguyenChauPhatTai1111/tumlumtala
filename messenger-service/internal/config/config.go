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
	cfg := mysql.Config{
		User:                 c.User,
		Passwd:               c.Password,
		Net:                  "tcp",
		Addr:                 c.Host + ":" + c.Port,
		DBName:               c.Name,
		ParseTime:            true,
		Loc:                  time.UTC,
		AllowNativePasswords: true,
	}
	return cfg.FormatDSN()
}

type RedisConfig struct {
	Host     string
	Port     string
	Password string
	DB       int
}

type Config struct {
	Database       DatabaseConfig
	Redis          RedisConfig
	KafkaBrokers   []string
	LocalUploadDir string
	LocalUploadURL string
	Port           string
	JWTSecret      string
	CORSOrigin     string
	Environment    string
	AppVersion     string
	LogLevel       string
	LogOutput      string
	LogCaller      bool
}

func Load() (Config, error) {
	if err := godotenv.Load(); err != nil && !os.IsNotExist(err) {
		return Config{}, fmt.Errorf("load .env: %w", err)
	}
	redisDB, _ := strconv.Atoi(env("REDIS_DB", "0"))
	cfg := Config{
		Database: DatabaseConfig{
			Host:     env("DB_HOST", "localhost"),
			Port:     env("DB_PORT", "3306"),
			User:     env("DB_USER", "tumlum"),
			Password: env("DB_PASSWORD", "tala"),
			Name:     env("DB_NAME", "tumlumtala_messenger"),
		},
		Redis: RedisConfig{
			Host:     env("REDIS_HOST", "localhost"),
			Port:     env("REDIS_PORT", "6379"),
			Password: env("REDIS_PASSWORD", ""),
			DB:       redisDB,
		},
		KafkaBrokers:   strings.Split(env("KAFKA_BROKERS", "tumlumtala-kafka:9092"), ","),
		LocalUploadDir: env("LOCAL_UPLOAD_DIR", "/app/uploads"),
		LocalUploadURL: env("LOCAL_UPLOAD_BASE_URL", "/api/v1/messenger-uploads"),
		Port:           env("PORT", "25056"),
		JWTSecret:      env("JWT_SECRET", "secret"),
		CORSOrigin:     env("CORS_ORIGIN", "http://localhost:3000"),
		Environment:    env("APP_ENV", "local"),
		AppVersion:     env("APP_VERSION", "local"),
		LogLevel:       env("LOG_LEVEL", "INFO"),
		LogOutput:      env("LOG_OUTPUT", "json"),
		LogCaller:      envBool("LOG_CALLER", false),
	}
	if err := validatePort("PORT", cfg.Port); err != nil {
		return Config{}, err
	}
	return cfg, nil
}

func env(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func envBool(key string, fallback bool) bool {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	parsed, err := strconv.ParseBool(v)
	if err != nil {
		return fallback
	}
	return parsed
}

func validatePort(name, value string) error {
	p, err := strconv.Atoi(value)
	if err != nil || p < 1 || p > 65535 {
		return fmt.Errorf("%s must be between 1 and 65535", name)
	}
	return nil
}
