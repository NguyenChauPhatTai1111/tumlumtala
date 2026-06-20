package main

import (
	"context"
	"errors"
	"log/slog"
	nethttp "net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	applicationservice "github.com/tumlumtala/gateway/internal/application/service"
	"github.com/tumlumtala/gateway/internal/config"
	"github.com/tumlumtala/gateway/internal/infrastructure/grpcclient"
	jwtinfra "github.com/tumlumtala/gateway/internal/infrastructure/jwt"
	redisinfra "github.com/tumlumtala/gateway/internal/infrastructure/redis"
	healthhandler "github.com/tumlumtala/gateway/internal/interfaces/health"
	httphandler "github.com/tumlumtala/gateway/internal/interfaces/http/handler"
	httpmodule "github.com/tumlumtala/gateway/internal/interfaces/http/module"
	httprouter "github.com/tumlumtala/gateway/internal/interfaces/http/router"
	"github.com/tumlumtala/gateway/internal/middleware"
	"github.com/tumlumtala/gateway/internal/shared/logger"
	"github.com/tumlumtala/gateway/internal/shared/metrics"
)

func main() {
	cfg := config.Load()
	log := logger.New(cfg.LogLevel)
	metrics.Register()

	userServiceAddr := grpcclient.ConnectionConfig{Service: grpcclient.UserService, Target: cfg.UserServiceAddr}
	authServiceAddr := grpcclient.ConnectionConfig{Service: grpcclient.AuthService, Target: cfg.AuthServiceAddr}

	serviceConfigs := []grpcclient.ConnectionConfig{
		authServiceAddr,
		userServiceAddr,
	}

	connections, err := grpcclient.NewConnections(serviceConfigs, log)
	if err != nil {
		log.Error("connect gRPC services failed", slog.Any("error", err))
		os.Exit(1)
	}
	defer connections.Close()

	userClient := grpcclient.NewUserClient(connections[grpcclient.UserService])

	redisClient, err := redisinfra.NewClient(cfg.Redis.Addr(), cfg.Redis.Password, cfg.Redis.DB)
	if err != nil {
		log.Error("connect redis failed", slog.Any("error", err))
		os.Exit(1)
	}
	defer func() { _ = redisClient.Close() }()

	jwtVerifier, err := jwtinfra.NewVerifier(cfg.JWTSecret, cfg.JWTPublicKeyPath, cfg.JWTAlgorithm, redisClient)
	if err != nil {
		log.Error("initialize jwt verifier failed", slog.Any("error", err))
		os.Exit(1)
	}

	authService := applicationservice.NewAuthService(grpcclient.NewAuthClient(connections[grpcclient.AuthService]))
	userService := applicationservice.NewUserService(userClient)
	authHandler := httphandler.NewAuthHandler(authService)
	userHandler := httphandler.NewUserHandler(userService)
	healthHandler := healthhandler.NewHandler()
	authMiddleware := middleware.Auth(jwtVerifier)
	router := httprouter.New(httprouter.Config{
		Logger:    log,
		Timeout:   middleware.Timeout(cfg.RequestTimeout),
		RateLimit: middleware.RateLimit(cfg.RateLimitPerMin),
		Modules: []httprouter.Module{
			httpmodule.NewAuthModule(authHandler),
			httpmodule.NewUserModule(userHandler, authMiddleware),
			httpmodule.NewHealthModule(healthHandler),
			httpmodule.NewMetricsModule(),
		},
	})

	server := &nethttp.Server{
		Addr:              ":" + cfg.AppPort,
		Handler:           router,
		ReadHeaderTimeout: 5 * time.Second,
	}

	errCh := make(chan error, 1)
	go func() {
		log.Info("gateway started", slog.String("addr", server.Addr))
		errCh <- server.ListenAndServe()
	}()

	stopCh := make(chan os.Signal, 1)
	signal.Notify(stopCh, syscall.SIGINT, syscall.SIGTERM)

	select {
	case sig := <-stopCh:
		log.Info("shutdown signal received", slog.String("signal", sig.String()))
	case err := <-errCh:
		if !errors.Is(err, nethttp.ErrServerClosed) {
			log.Error("http server stopped", slog.Any("error", err))
			os.Exit(1)
		}
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := server.Shutdown(ctx); err != nil {
		log.Error("graceful shutdown failed", slog.Any("error", err))
		os.Exit(1)
	}
	log.Info("gateway stopped")
}
