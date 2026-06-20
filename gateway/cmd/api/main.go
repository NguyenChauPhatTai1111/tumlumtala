package main

import (
	"os"

	"github.com/tumlumtala/gateway/internal/application"
	"github.com/tumlumtala/gateway/internal/config"
	"github.com/tumlumtala/gateway/internal/shared/logger"
)

func main() {
	cfg := config.Load()
	log := logger.New(logger.Config{
		Level:       cfg.LogLevel,
		Output:      cfg.LogOutput,
		Environment: cfg.Environment,
	})

	app, err := application.New(cfg)
	if err != nil {
		log.Error("initialize gateway failed", "error", err)
		os.Exit(1)
	}

	if err := app.Run(); err != nil {
		log.Error("gateway run failed", "error", err)
		os.Exit(1)
	}
}
