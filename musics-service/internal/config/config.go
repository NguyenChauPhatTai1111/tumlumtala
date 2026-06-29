package config

import (
	"fmt"
	"os"
	"strings"
)

type Config struct {
	Port         string
	CORSOrigin   string
	DB           DatabaseConfig
	JWTSecret    string
	KafkaBrokers []string
	MusicAI      MusicAIConfig
}

type MusicAIConfig struct {
	Endpoint string
	APIKey   string
	Model    string
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
		Port:         getEnv("PORT", "25057"),
		CORSOrigin:   getEnv("CORS_ORIGIN", "http://localhost:3000"),
		JWTSecret:    os.Getenv("JWT_SECRET"),
		KafkaBrokers: strings.Split(getEnv("KAFKA_BROKERS", "tumlumtala-kafka:9092"), ","),
		MusicAI: MusicAIConfig{
			Endpoint: strings.TrimRight(os.Getenv("MUSIC_AI_ENDPOINT"), "/"),
			APIKey:   os.Getenv("MUSIC_AI_API_KEY"),
			Model:    getEnv("MUSIC_AI_MODEL", "music-intent"),
		},
		DB: DatabaseConfig{
			Host:     getEnv("DB_HOST", "localhost"),
			Port:     getEnv("DB_PORT", "3306"),
			User:     getEnv("DB_USER", "tumlum"),
			Password: getEnv("DB_PASSWORD", "tala"),
			Name:     getEnv("DB_NAME", "tumlumtala_musics"),
		},
	}, nil
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
