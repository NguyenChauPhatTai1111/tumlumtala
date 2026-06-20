package config

import (
	"os"
	"strconv"
	"time"
)

type Config struct {
	AppPort           string
	HostPort          string
	Environment       string
	LogLevel          string
	JWTSecret         string
	JWTPublicKeyPath  string
	JWTAlgorithm      string
	AuthServiceAddr   string
	UserServiceAddr   string
	CourseServiceAddr string
	OrderServiceAddr  string
	RequestTimeout    time.Duration
	RateLimitPerMin   int
}

func Load() Config {
	return Config{
		AppPort:           getEnv("APP_PORT", "8080"),
		HostPort:          getEnv("HOST_PORT", "8888"),
		Environment:       getEnv("APP_ENV", "local"),
		LogLevel:          getEnv("LOG_LEVEL", "INFO"),
		JWTSecret:         getEnv("JWT_SECRET", "change-me"),
		JWTPublicKeyPath:  getEnv("JWT_PUBLIC_KEY_PATH", ""),
		JWTAlgorithm:      getEnv("JWT_ALGORITHM", "HS256"),
		AuthServiceAddr:   getEnv("AUTH_SERVICE_ADDR", "localhost:50052"),
		UserServiceAddr:   getEnv("USER_SERVICE_ADDR", "localhost:50051"),
		CourseServiceAddr: getEnv("COURSE_SERVICE_ADDR", "localhost:50053"),
		OrderServiceAddr:  getEnv("ORDER_SERVICE_ADDR", "localhost:50054"),
		RequestTimeout:    time.Duration(getEnvInt("REQUEST_TIMEOUT_SECONDS", 5)) * time.Second,
		RateLimitPerMin:   getEnvInt("RATE_LIMIT_PER_MINUTE", 120),
	}
}

func getEnv(key, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	return value
}

func getEnvInt(key string, fallback int) int {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}
	return parsed
}
