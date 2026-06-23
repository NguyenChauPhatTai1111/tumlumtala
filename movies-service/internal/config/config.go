package config

import (
	"fmt"
	"os"
	"strings"
)

type Config struct {
	Port         string
	CORSOrigin   string
	TMDBAPIKey   string
	DB           DatabaseConfig
	JWTSecret    string
	KafkaBrokers []string
}

type DatabaseConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	Name     string
}

func (d DatabaseConfig) DSN() string {
	return fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		d.User, d.Password, d.Host, d.Port, d.Name)
}

func Load() (*Config, error) {
	return &Config{
		Port:       getEnv("PORT", "25055"),
		CORSOrigin: getEnv("CORS_ORIGIN", "http://localhost:3000"),
		TMDBAPIKey: os.Getenv("TMDB_API_KEY"),
		JWTSecret:    os.Getenv("JWT_SECRET"),
		KafkaBrokers: strings.Split(getEnv("KAFKA_BROKERS", "tumlumtala-kafka:9092"), ","),
		DB: DatabaseConfig{
			Host:     getEnv("DB_HOST", "localhost"),
			Port:     getEnv("DB_PORT", "3306"),
			User:     getEnv("DB_USER", "tumlum"),
			Password: getEnv("DB_PASSWORD", "tala"),
			Name:     getEnv("DB_NAME", "tumlumtala_movies"),
		},
	}, nil
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
