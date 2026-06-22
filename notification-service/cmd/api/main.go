package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"

	"tumlumtala/notification-service/internal/application"
	"tumlumtala/notification-service/internal/config"
)

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	app, err := application.New(config.Load())
	if err != nil {
		panic(err)
	}
	defer app.Close()

	if err := app.StartGRPC(ctx); err != nil && ctx.Err() == nil {
		panic(err)
	}
}
