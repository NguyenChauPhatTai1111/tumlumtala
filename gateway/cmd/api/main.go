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
		Service:      logger.ServiceGateway,
		Level:        cfg.LogLevel,
		Output:       cfg.LogOutput,
		Environment:  cfg.Environment,
		Version:      cfg.AppVersion,
		EnableCaller: cfg.LogCaller,
	})

	app, err := application.New(cfg)
	if err != nil {
		log.Error().Err(err).Msg("initialize gateway failed")
		os.Exit(1)
	}

	if err := app.Run(); err != nil {
		log.Error().Err(err).Msg("gateway run failed")
		os.Exit(1)
	}
}
