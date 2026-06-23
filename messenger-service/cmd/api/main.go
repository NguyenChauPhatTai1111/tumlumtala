package main

import (
	"context"
	"log/slog"
	"net/http"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/tumlumtala/messenger-service/internal/bootstrap"
	"github.com/tumlumtala/messenger-service/internal/config"
	database "github.com/tumlumtala/messenger-service/internal/infrastructure/db"
	kafkainfra "github.com/tumlumtala/messenger-service/internal/infrastructure/kafka"
	"github.com/tumlumtala/messenger-service/internal/shared/logger"
)

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	cfg, err := config.Load()
	if err != nil {
		panic(err)
	}

	log := logger.New(logger.Config{
		Service:      logger.ServiceMessenger,
		Environment:  cfg.Environment,
		Version:      cfg.AppVersion,
		Level:        cfg.LogLevel,
		Output:       cfg.LogOutput,
		EnableCaller: cfg.LogCaller,
	})

	db, err := database.OpenMySQL(ctx, cfg.Database.DSN())
	if err != nil {
		log.Fatal().Err(err).Msg("open database failed")
	}
	sqlDB, err := db.DB()
	if err != nil {
		log.Fatal().Err(err).Msg("get database handle failed")
	}
	defer func() { _ = sqlDB.Close() }()

	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}
	engine := gin.New()
	engine.Use(gin.Recovery())

	// Start Kafka consumer to sync user_snapshots.
	// slog.Default() bridges to the process-level structured logger.
	userSnapshotConsumer := kafkainfra.NewUserSnapshotConsumer(db, cfg.KafkaBrokers, slog.Default())
	go userSnapshotConsumer.Run(ctx)

	bootstrap.Register(engine, db, cfg)

	srv := &http.Server{
		Addr:    ":" + cfg.Port,
		Handler: engine,
	}

	go func() {
		log.Info().Str("port", cfg.Port).Msg("messenger-service started")
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal().Err(err).Msg("messenger-service stopped with error")
		}
	}()

	<-ctx.Done()
	log.Info().Msg("shutting down messenger-service")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Error().Err(err).Msg("shutdown error")
	}
	log.Info().Msg("messenger-service exited")
}
