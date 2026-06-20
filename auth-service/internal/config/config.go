package config

import (
	"fmt"
	"os"
	"strconv"
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

func (r RedisConfig) Addr() string { return r.Host + ":" + r.Port }

type Config struct {
	Database  DatabaseConfig
	Redis     RedisConfig
	Port      string
	JWTSecret string
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
			Name:     env("DB_NAME", "tumlumtala_auth"),
		},
		Redis: RedisConfig{
			Host:     env("REDIS_HOST", "localhost"),
			Port:     env("REDIS_PORT", "6379"),
			Password: env("REDIS_PASSWORD", "redis_password"),
			DB:       redisDB,
		},
		Port:      env("PORT", "25053"),
		JWTSecret: env("JWT_SECRET", "change-me-in-production"),
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

func validatePort(name, value string) error {
	port, err := strconv.Atoi(value)
	if err != nil || port < 1 || port > 65535 {
		return fmt.Errorf("%s must be between 1 and 65535", name)
	}
	return nil
}
