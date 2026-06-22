package logger

import (
	"io"
	"os"
	"strings"
	"time"

	"github.com/rs/zerolog"
)

const ServiceMessenger = "messenger-service"

type Config struct {
	Service      string
	Environment  string
	Version      string
	Level        string
	Output       string
	EnableCaller bool
	Writer       io.Writer
}

func New(cfg Config) zerolog.Logger {
	zerolog.SetGlobalLevel(parseLevel(cfg.Level))
	zerolog.TimeFieldFormat = time.RFC3339Nano

	writer := cfg.Writer
	if writer == nil {
		writer = os.Stdout
	}
	if isPretty(cfg.Output, cfg.Environment) {
		writer = zerolog.ConsoleWriter{Out: writer, TimeFormat: time.RFC3339}
	}

	service := cfg.Service
	if service == "" {
		service = ServiceMessenger
	}

	log := zerolog.New(writer).
		With().
		Timestamp().
		Str("service", service).
		Str("env", cfg.Environment).
		Str("version", cfg.Version).
		Logger()

	if cfg.EnableCaller {
		log = log.With().Caller().Logger()
	}
	return log
}

func parseLevel(level string) zerolog.Level {
	switch strings.ToLower(strings.TrimSpace(level)) {
	case "debug":
		return zerolog.DebugLevel
	case "warn", "warning":
		return zerolog.WarnLevel
	case "error":
		return zerolog.ErrorLevel
	case "fatal":
		return zerolog.FatalLevel
	default:
		return zerolog.InfoLevel
	}
}

func isPretty(output, env string) bool {
	output = strings.ToLower(strings.TrimSpace(output))
	env = strings.ToLower(strings.TrimSpace(env))
	return output == "text" || output == "pretty" || env == "dev" || env == "development"
}
