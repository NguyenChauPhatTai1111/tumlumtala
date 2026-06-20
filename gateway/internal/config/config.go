package config

import (
	"os"
	"strconv"
	"time"
)

type RedisConfig struct {
	Host     string
	Port     string
	Password string
	DB       int
}

func (r RedisConfig) Addr() string { return r.Host + ":" + r.Port }

type Config struct {
	AppPort           string
	HostPort          string
	Environment       string
	LogLevel          string
	LogOutput         string
	JWTSecret         string
	JWTPublicKeyPath  string
	JWTAlgorithm      string
	AuthServiceAddr          string
	AuthorizationServiceAddr string
	UserServiceAddr          string
	CourseServiceAddr        string
	OrderServiceAddr         string
	RequestTimeout    time.Duration
	RateLimitPerMin   int
	Redis             RedisConfig
}

func Load() Config {
	return Config{
		AppPort:           getEnv("APP_PORT", "8080"),
		HostPort:          getEnv("HOST_PORT", "8888"),
		Environment:       getEnv("APP_ENV", "local"),
		LogLevel:          getEnv("LOG_LEVEL", "INFO"),
		LogOutput:         getEnv("LOG_OUTPUT", "json"),
		JWTSecret:         getEnv("JWT_SECRET", "change-me"),
		JWTPublicKeyPath:  getEnv("JWT_PUBLIC_KEY_PATH", ""),
		JWTAlgorithm:      getEnv("JWT_ALGORITHM", "HS256"),
		AuthServiceAddr:          getEnv("AUTH_SERVICE_ADDR", "localhost:250053"),
		AuthorizationServiceAddr: getEnv("AUTHORIZATION_SERVICE_ADDR", "localhost:250054"),
		UserServiceAddr:          getEnv("USER_SERVICE_ADDR", "localhost:250052"),
		CourseServiceAddr: getEnv("COURSE_SERVICE_ADDR", "localhost:250054"),
		OrderServiceAddr:  getEnv("ORDER_SERVICE_ADDR", "localhost:250055"),
		RequestTimeout:    time.Duration(getEnvInt("REQUEST_TIMEOUT_SECONDS", 5)) * time.Second,
		RateLimitPerMin:   getEnvInt("RATE_LIMIT_PER_MINUTE", 120),
		Redis: RedisConfig{
			Host:     getEnv("REDIS_HOST", "localhost"),
			Port:     getEnv("REDIS_PORT", "6379"),
			Password: getEnv("REDIS_PASSWORD", "redis_password"),
			DB:       getEnvInt("REDIS_DB", 0),
		},
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
