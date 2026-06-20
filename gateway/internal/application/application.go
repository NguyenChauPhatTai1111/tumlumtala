package application

import (
	"context"
	"errors"
	"log/slog"
	nethttp "net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"github.com/tumlumtala/gateway/internal/config"
	sharedgrpc "github.com/tumlumtala/gateway/internal/infrastructure/grpcclient"
	jwtinfra "github.com/tumlumtala/gateway/internal/infrastructure/jwt"
	redisinfra "github.com/tumlumtala/gateway/internal/infrastructure/redis"
	healthhandler "github.com/tumlumtala/gateway/internal/interfaces/health"
	httproutes "github.com/tumlumtala/gateway/internal/interfaces/http/routes"
	"github.com/tumlumtala/gateway/internal/middleware"
	authgrpc "github.com/tumlumtala/gateway/internal/modules/auth/grpcclient"
	authhttp "github.com/tumlumtala/gateway/internal/modules/auth/http"
	authservice "github.com/tumlumtala/gateway/internal/modules/auth/service"
	authzgrpc "github.com/tumlumtala/gateway/internal/modules/authorization/grpcclient"
	usergrpc "github.com/tumlumtala/gateway/internal/modules/user/grpcclient"
	userhttp "github.com/tumlumtala/gateway/internal/modules/user/http"
	userservice "github.com/tumlumtala/gateway/internal/modules/user/service"
	"github.com/tumlumtala/gateway/internal/shared/logger"
	"github.com/tumlumtala/gateway/internal/shared/metrics"
)

type Application struct {
	cfg         config.Config
	log         *slog.Logger
	server      *nethttp.Server
	connections sharedgrpc.Connections
	redis       interface{ Close() error }
}

func New(cfg config.Config) (*Application, error) {
	log := logger.New(logger.Config{
		Level:       cfg.LogLevel,
		Output:      cfg.LogOutput,
		Environment: cfg.Environment,
	})
	metrics.Register()

	connections, err := sharedgrpc.NewConnections([]sharedgrpc.ConnectionConfig{
		{Service: sharedgrpc.AuthService, Target: cfg.AuthServiceAddr},
		{Service: sharedgrpc.AuthorizationService, Target: cfg.AuthorizationServiceAddr},
		{Service: sharedgrpc.UserService, Target: cfg.UserServiceAddr},
	}, log)
	if err != nil {
		return nil, err
	}

	redisClient, err := redisinfra.NewClient(cfg.Redis.Addr(), cfg.Redis.Password, cfg.Redis.DB)
	if err != nil {
		connections.Close()
		return nil, err
	}

	router, err := buildRouter(cfg, log, connections, redisClient)
	if err != nil {
		connections.Close()
		_ = redisClient.Close()
		return nil, err
	}

	return &Application{
		cfg:         cfg,
		log:         log,
		connections: connections,
		redis:       redisClient,
		server: &nethttp.Server{
			Addr:              ":" + cfg.AppPort,
			Handler:           router,
			ReadHeaderTimeout: 5 * time.Second,
		},
	}, nil
}

func (app *Application) Run() error {
	defer app.connections.Close()
	defer func() { _ = app.redis.Close() }()

	errCh := make(chan error, 1)
	go func() {
		app.log.Info("gateway started", slog.String("addr", app.server.Addr))
		errCh <- app.server.ListenAndServe()
	}()

	stopCh := make(chan os.Signal, 1)
	signal.Notify(stopCh, syscall.SIGINT, syscall.SIGTERM)

	select {
	case sig := <-stopCh:
		app.log.Info("shutdown signal received", slog.String("signal", sig.String()))
	case err := <-errCh:
		if !errors.Is(err, nethttp.ErrServerClosed) {
			return err
		}
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := app.server.Shutdown(ctx); err != nil {
		return err
	}
	app.log.Info("gateway stopped")
	return nil
}

func buildRouter(cfg config.Config, log *slog.Logger, connections sharedgrpc.Connections, redisClient *redis.Client) (*gin.Engine, error) {
	jwtVerifier, err := jwtinfra.NewVerifier(cfg.JWTSecret, cfg.JWTPublicKeyPath, cfg.JWTAlgorithm, redisClient)
	if err != nil {
		return nil, err
	}

	authzClient := authzgrpc.NewAuthorizationClient(connections[sharedgrpc.AuthorizationService])

	authService := authservice.NewAuthService(authgrpc.NewAuthClient(connections[sharedgrpc.AuthService]))
	userService := userservice.NewUserService(usergrpc.NewUserClient(connections[sharedgrpc.UserService]))
	authHandler := authhttp.NewAuthHandler(authService)
	userHandler := userhttp.NewUserHandler(userService)
	healthHandler := healthhandler.NewHandler()

	gin.SetMode(gin.ReleaseMode)
	router := gin.New()
	httproutes.RegisterRoutes(router, httproutes.RegisterOptions{
		Logger:    log,
		Auth:      middleware.Auth(jwtVerifier),
		Timeout:   middleware.Timeout(cfg.RequestTimeout),
		RateLimit: middleware.RateLimit(cfg.RateLimitPerMin),
	},
		authhttp.NewAuthRoutes(authHandler),
		userhttp.NewUserRoutes(userHandler, authzClient),
		httproutes.NewHealthRoutes(healthHandler),
		httproutes.NewMetricsRoutes(),
	)
	return router, nil
}
