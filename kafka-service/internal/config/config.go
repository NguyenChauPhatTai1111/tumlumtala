package config

import (
	"os"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	Brokers []string
}

func Load() Config {
	_ = godotenv.Load()
	brokers := os.Getenv("KAFKA_BROKERS")
	if brokers == "" {
		brokers = "tumlumtala-kafka:9092"
	}
	return Config{
		Brokers: strings.Split(brokers, ","),
	}
}
