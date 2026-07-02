package config

import (
	"fmt"
	"os"
	"strings"
	"time"
)

type Config struct {
	Port         string
	CORSOrigin   string
	DB           DatabaseConfig
	JWTSecret    string
	KafkaBrokers []string
	MusicAI      MusicAIConfig
	Spotify      SpotifyConfig
	YouTube      YouTubeConfig
}

type MusicAIConfig struct {
	Endpoint string
	APIKey   string
	Model    string
}

type SpotifyConfig struct {
	ClientID     string
	ClientSecret string
	Market       string
}

type YouTubeConfig struct {
	APIKey   string
	CacheTTL time.Duration
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
		Spotify: SpotifyConfig{
			ClientID:     os.Getenv("SPOTIFY_CLIENT_ID"),
			ClientSecret: os.Getenv("SPOTIFY_CLIENT_SECRET"),
			Market:       getEnv("SPOTIFY_MARKET", "VN"),
		},
		YouTube: YouTubeConfig{
			APIKey:   os.Getenv("YOUTUBE_API_KEY"),
			CacheTTL: getDurationEnv("YOUTUBE_CACHE_TTL", 30*24*time.Hour),
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

func getDurationEnv(key string, fallback time.Duration) time.Duration {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	duration, err := time.ParseDuration(value)
	if err != nil {
		return fallback
	}
	return duration
}
