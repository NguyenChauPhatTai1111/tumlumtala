package application

import (
	"tumlumtala/notification-service/internal/config"

	"github.com/rs/zerolog"
)

type Application struct {
	cfg config.Config
	log zerolog.Logger
}

func New(cfg config.Config) (*Application, error) {


	return &Application{
		cfg: cfg,
	}, nil
}
