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

type BunnyCDNConfig struct {
	StorageZone    string
	APIKey         string
	StorageBaseURL string
	CDNBaseURL     string
}

type Config struct {
	AppPort                  string
	HostPort                 string
	Environment              string
	AppVersion               string
	LogLevel                 string
	LogOutput                string
	LogCaller                bool
	TracingEnabled           bool
	OTLPEndpoint             string
	JWTSecret                string
	JWTPublicKeyPath         string
	JWTAlgorithm             string
	AuthServiceAddr          string
	AuthorizationServiceAddr string
	UserServiceAddr          string
	CourseServiceAddr        string
	OrderServiceAddr         string
	MessengerServiceURL      string
	MoviesServiceURL         string
	RequestTimeout           time.Duration
	RateLimitPerMin          int
	Redis                    RedisConfig
	BunnyCDN                 BunnyCDNConfig
}

func Load() Config {
	return Config{
		AppPort:                  getEnv("APP_PORT", "8080"),
		HostPort:                 getEnv("HOST_PORT", "8888"),
		Environment:              getEnv("APP_ENV", "local"),
		AppVersion:               getEnv("APP_VERSION", "local"),
		LogLevel:                 getEnv("LOG_LEVEL", "INFO"),
		LogOutput:                getEnv("LOG_OUTPUT", "json"),
		LogCaller:                getEnvBool("LOG_CALLER", false),
		TracingEnabled:           getEnvBool("TRACING_ENABLED", true),
		OTLPEndpoint:             getEnv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4318"),
		JWTSecret:                getEnv("JWT_SECRET", "change-me"),
		JWTPublicKeyPath:         getEnv("JWT_PUBLIC_KEY_PATH", ""),
		JWTAlgorithm:             getEnv("JWT_ALGORITHM", "HS256"),
		AuthServiceAddr:          getEnv("AUTH_SERVICE_ADDR", "localhost:250053"),
		AuthorizationServiceAddr: getEnv("AUTHORIZATION_SERVICE_ADDR", "localhost:250054"),
		UserServiceAddr:          getEnv("USER_SERVICE_ADDR", "localhost:250052"),
		CourseServiceAddr:        getEnv("COURSE_SERVICE_ADDR", "localhost:250054"),
		OrderServiceAddr:         getEnv("ORDER_SERVICE_ADDR", "localhost:250055"),
		MessengerServiceURL:      getEnv("MESSENGER_SERVICE_URL", "http://localhost:25056"),
		MoviesServiceURL:         getEnv("MOVIES_SERVICE_URL", "http://localhost:25055"),
		RequestTimeout:           time.Duration(getEnvInt("REQUEST_TIMEOUT_SECONDS", 5)) * time.Second,
		RateLimitPerMin:          getEnvInt("RATE_LIMIT_PER_MINUTE", 120),
		Redis: RedisConfig{
			Host:     getEnv("REDIS_HOST", "localhost"),
			Port:     getEnv("REDIS_PORT", "6379"),
			Password: getEnv("REDIS_PASSWORD", "redis_password"),
			DB:       getEnvInt("REDIS_DB", 0),
		},
		BunnyCDN: BunnyCDNConfig{
			StorageZone:    getEnv("BUNNYCDN_STORAGE_ZONE", ""),
			APIKey:         getEnv("BUNNYCDN_API_KEY", ""),
			StorageBaseURL: getEnv("BUNNYCDN_STORAGE_BASE_URL", "https://storage.bunnycdn.com"),
			CDNBaseURL:     getEnv("BUNNYCDN_CDN_BASE_URL", ""),
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

func getEnvBool(key string, fallback bool) bool {
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
