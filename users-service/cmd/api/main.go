package main

import (
	"context"
	"net"
	"os/signal"
	"syscall"
	"time"

	bootstrap "github.com/tumlumtala/users-service/internal/bootstrap"
	"github.com/tumlumtala/users-service/internal/config"
	database "github.com/tumlumtala/users-service/internal/infrastructure/db"
	"github.com/tumlumtala/users-service/internal/shared/grpcmiddleware"
	"github.com/tumlumtala/users-service/internal/shared/logger"
	"github.com/tumlumtala/users-service/internal/shared/observability"
	"go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc"
	"google.golang.org/grpc"
)

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()
	cfg, err := config.Load()
	if err != nil {
		panic(err)
	}

	log := logger.New(logger.Config{
		Service:      logger.ServiceUsers,
		Environment:  cfg.Environment,
		Version:      cfg.AppVersion,
		Level:        cfg.LogLevel,
		Output:       cfg.LogOutput,
		EnableCaller: cfg.LogCaller,
	})

	shutdownTracing, err := observability.InitTracing(ctx, observability.TracingConfig{
		ServiceName: logger.ServiceUsers,
		Environment: cfg.Environment,
		Version:     cfg.AppVersion,
		Endpoint:    cfg.OTLPEndpoint,
		Enabled:     cfg.TracingEnabled,
	})
	if err != nil {
		log.Fatal().Err(err).Msg("initialize tracing failed")
	}
	defer func() {
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if err := shutdownTracing(shutdownCtx); err != nil {
			log.Error().Err(err).Msg("shutdown tracing failed")
		}
	}()

	db, err := database.OpenMySQL(ctx, cfg.Database.DSN())
	if err != nil {
		log.Fatal().Err(err).Msg("open database failed")
	}
	sqlDB, err := db.DB()
	if err != nil {
		log.Fatal().Err(err).Msg("get database handle failed")
	}
	defer func() { _ = sqlDB.Close() }()
	lis, err := net.Listen("tcp", ":"+cfg.Port)
	if err != nil {
		log.Fatal().Err(err).Str("port", cfg.Port).Msg("listen failed")
	}
	server := grpc.NewServer(
		grpc.StatsHandler(otelgrpc.NewServerHandler()),
		grpc.ChainUnaryInterceptor(grpcmiddleware.UnaryServerLogging(log)),
	)
	bootstrap.Register(server, db, cfg.KafkaBrokers)
	go func() { <-ctx.Done(); server.GracefulStop() }()
	log.Info().Stringer("addr", lis.Addr()).Msg("users-service started")
	if err := server.Serve(lis); err != nil {
		log.Fatal().Err(err).Msg("users-service stopped with error")
	}
}
