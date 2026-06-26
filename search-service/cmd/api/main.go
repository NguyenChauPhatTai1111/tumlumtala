package main

import (
	"context"
	"os"
	"os/signal"
	"search-service/internal/application"
	"search-service/internal/config"
	"syscall"
)

func main() {

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	app, err := application.New(config.Load())
	if err != nil {
		panic(err)
	}
	defer app.Close()

	if err := app.Run(ctx); err != nil && ctx.Err() == nil {
		panic(err)
	}

}
