package config

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"syscall"
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

type BunnyCDNConfig struct {
	APIKey      string
	StorageZone string
	CDNBaseURL  string
}

type LocalUploadConfig struct {
	Dir     string
	BaseURL string
}

type RedisConfig struct {
	Host     string
	Port     string
	Password string
	DB       int
}

type NotificationConfig struct {
	ServiceAddr string
	Channel     string
	Timeout     time.Duration
}

type Config struct {
	Database     DatabaseConfig
	BunnyCDN     BunnyCDNConfig
	LocalUpload  LocalUploadConfig
	Redis        RedisConfig
	Notification NotificationConfig
	KafkaBrokers []string
	Port         string
	JWTSecret    string
	CORSOrigin   string
	Environment  string
	AppVersion   string
	LogLevel     string
	LogOutput    string
	LogCaller    bool
}

func Load() (Config, error) {
	if err := loadDotEnv(); err != nil {
		return Config{}, err
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
		BunnyCDN: BunnyCDNConfig{
			APIKey:      env("BUNNYCDN_API_KEY", ""),
			StorageZone: env("BUNNYCDN_STORAGE_ZONE", ""),
			CDNBaseURL:  env("BUNNYCDN_CDN_BASE_URL", ""),
		},
		LocalUpload: LocalUploadConfig{
			Dir:     env("LOCAL_UPLOAD_DIR", defaultLocalUploadDir()),
			BaseURL: env("LOCAL_UPLOAD_BASE_URL", "/api/v1/messenger-uploads"),
		},
		Redis: RedisConfig{
			Host:     env("REDIS_HOST", "localhost"),
			Port:     env("REDIS_PORT", "6379"),
			Password: env("REDIS_PASSWORD", ""),
			DB:       redisDB,
		},
		Notification: NotificationConfig{
			ServiceAddr: env("NOTIFICATION_SERVICE_ADDR", ""),
			Channel:     env("NOTIFICATION_CALL_CHANNEL", "alert"),
			Timeout:     envDuration("NOTIFICATION_CALL_TIMEOUT", 1500*time.Millisecond),
		},
		KafkaBrokers: strings.Split(env("KAFKA_BROKERS", "tumlumtala-kafka:9092"), ","),
		Port:         env("PORT", "25056"),
		JWTSecret:    env("JWT_SECRET", "secret"),
		CORSOrigin:   env("CORS_ORIGIN", "http://localhost:3000"),
		Environment:  env("APP_ENV", "local"),
		AppVersion:   env("APP_VERSION", "local"),
		LogLevel:     env("LOG_LEVEL", "INFO"),
		LogOutput:    env("LOG_OUTPUT", "json"),
		LogCaller:    envBool("LOG_CALLER", false),
	}
	if err := validatePort("PORT", cfg.Port); err != nil {
		return Config{}, err
	}
	return cfg, nil
}

func loadDotEnv() error {
	for _, filename := range []string{".env", "messenger-service/.env"} {
		if err := godotenv.Load(filename); err != nil {
			if os.IsNotExist(err) || errors.Is(err, syscall.ENOTDIR) {
				continue
			}
			return fmt.Errorf("load %s: %w", filename, err)
		}
	}
	return nil
}

func defaultLocalUploadDir() string {
	wd, err := os.Getwd()
	if err != nil {
		return "../frontend/uploads"
	}
	if filepath.Base(wd) == "messenger-service" {
		return filepath.Clean(filepath.Join(wd, "..", "frontend", "uploads"))
	}
	return filepath.Clean(filepath.Join(wd, "frontend", "uploads"))
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

func envDuration(key string, fallback time.Duration) time.Duration {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	parsed, err := time.ParseDuration(v)
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
