package logger

import (
	"log/slog"
	"os"
	"strings"
)

type Config struct {
	Level       string
	Output      string
	Environment string
}

func New(cfg Config) *slog.Logger {
	var slogLevel slog.Level
	switch strings.ToUpper(cfg.Level) {
	case "DEBUG":
		slogLevel = slog.LevelDebug
	case "WARN":
		slogLevel = slog.LevelWarn
	case "ERROR":
		slogLevel = slog.LevelError
	default:
		slogLevel = slog.LevelInfo
	}

	if strings.EqualFold(cfg.Output, "stdout") || strings.EqualFold(cfg.Output, "text") || strings.EqualFold(cfg.Environment, "dev") || strings.EqualFold(cfg.Environment, "development") {
		return slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
			Level: slogLevel,
		}))
	}

	return slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slogLevel,
	}))
}
