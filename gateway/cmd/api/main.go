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

	"github.com/tumlumtala/gateway/internal/application/service"
	"github.com/tumlumtala/gateway/internal/config"
	"github.com/tumlumtala/gateway/internal/infrastructure/grpcclient"
	jwtinfra "github.com/tumlumtala/gateway/internal/infrastructure/jwt"
	healthhandler "github.com/tumlumtala/gateway/internal/interfaces/health"
	httphandler "github.com/tumlumtala/gateway/internal/interfaces/http/handler"
	httprouter "github.com/tumlumtala/gateway/internal/interfaces/http/router"
	"github.com/tumlumtala/gateway/internal/middleware"
	"github.com/tumlumtala/gateway/internal/shared/logger"
	"github.com/tumlumtala/gateway/internal/shared/metrics"
)

func main() {
	cfg := config.Load()
	log := logger.New(cfg.LogLevel)
	metrics.Register()

	authConn, err := grpcclient.NewConnection(cfg.AuthServiceAddr, log)
	if err != nil {
		log.Error("connect auth service failed", slog.Any("error", err))
		os.Exit(1)
	}
	defer authConn.Close()

	userConn, err := grpcclient.NewConnection(cfg.UserServiceAddr, log)
	if err != nil {
		log.Error("connect user service failed", slog.Any("error", err))
		os.Exit(1)
	}
	defer userConn.Close()

	courseConn, err := grpcclient.NewConnection(cfg.CourseServiceAddr, log)
	if err != nil {
		log.Error("connect course service failed", slog.Any("error", err))
		os.Exit(1)
	}
	defer courseConn.Close()

	orderConn, err := grpcclient.NewConnection(cfg.OrderServiceAddr, log)
	if err != nil {
		log.Error("connect order service failed", slog.Any("error", err))
		os.Exit(1)
	}
	defer orderConn.Close()

	_ = grpcclient.NewUserClient(userConn)
	_ = grpcclient.NewCourseClient(courseConn)
	_ = grpcclient.NewOrderClient(orderConn)

	jwtVerifier, err := jwtinfra.NewVerifier(cfg.JWTSecret, cfg.JWTPublicKeyPath, cfg.JWTAlgorithm)
	if err != nil {
		log.Error("initialize jwt verifier failed", slog.Any("error", err))
		os.Exit(1)
	}

	authService := service.NewAuthService(grpcclient.NewAuthClient(authConn))
	authHandler := httphandler.NewAuthHandler(authService)
	healthHandler := healthhandler.NewHandler()
	router := httprouter.New(httprouter.Config{
		Logger:         log,
		AuthHandler:    authHandler,
		HealthHandler:  healthHandler,
		AuthMiddleware: middleware.Auth(jwtVerifier),
		Timeout:        middleware.Timeout(cfg.RequestTimeout),
		RateLimit:      middleware.RateLimit(cfg.RateLimitPerMin),
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
