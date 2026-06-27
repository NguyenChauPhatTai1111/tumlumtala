package application

import (
	"context"
	"search-service/internal/config"
	"search-service/internal/shared/logger"

	"github.com/rs/zerolog"
)

type Application struct {
	cfg config.Config
	log zerolog.Logger
}

func New(cfg config.Config) (*Application, error) {
	// Chọn output log theo config:
	// production thường dùng json, local dev có thể dùng text
	output := "json"
	if !cfg.Log.JSON {
		output = "text"
	}

	// Khởi tạo structured logger cho service
	log := logger.New(logger.Config{
		Service:     cfg.App.Name,
		Level:       cfg.Log.Level,
		Output:      output,
		Environment: cfg.App.Env,
	})

	return &Application{
		cfg: cfg,
		log: log,
	}, nil

}

func (a *Application) Run(ctx context.Context) error {
	return nil
}

func (a *Application) Close() error {
	return nil
}
