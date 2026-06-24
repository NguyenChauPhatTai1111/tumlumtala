package application

import (
	"context"
	"errors"
	nethttp "net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"github.com/rs/zerolog"
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
	messengerhttp "github.com/tumlumtala/gateway/internal/modules/messenger/http"
	movieshttp "github.com/tumlumtala/gateway/internal/modules/movies/http"
	musicshttp "github.com/tumlumtala/gateway/internal/modules/musics/http"
	usergrpc "github.com/tumlumtala/gateway/internal/modules/user/grpcclient"
	userhttp "github.com/tumlumtala/gateway/internal/modules/user/http"
	userservice "github.com/tumlumtala/gateway/internal/modules/user/service"
	bunnycdn "github.com/tumlumtala/gateway/pkg/bunnycdn"
	"github.com/tumlumtala/gateway/internal/shared/logger"
	"github.com/tumlumtala/gateway/internal/shared/metrics"
	"github.com/tumlumtala/gateway/internal/shared/observability"
	"go.opentelemetry.io/contrib/instrumentation/github.com/gin-gonic/gin/otelgin"
)

type Application struct {
	cfg          config.Config
	log          zerolog.Logger
	server       *nethttp.Server
	grpcRegistry *sharedgrpc.Registry
	redis        interface{ Close() error }
	shutdownOtel func(context.Context) error
}

func New(cfg config.Config) (*Application, error) {
	log := logger.New(logger.Config{
		Service:      logger.ServiceGateway,
		Level:        cfg.LogLevel,
		Output:       cfg.LogOutput,
		Environment:  cfg.Environment,
		Version:      cfg.AppVersion,
		EnableCaller: cfg.LogCaller,
	})
	metrics.Register()

	shutdownOtel, err := observability.InitTracing(context.Background(), observability.TracingConfig{
		ServiceName: logger.ServiceGateway,
		Environment: cfg.Environment,
		Version:     cfg.AppVersion,
		Endpoint:    cfg.OTLPEndpoint,
		Enabled:     cfg.TracingEnabled,
	})
	if err != nil {
		return nil, err
	}

	grpcRegistry, err := sharedgrpc.NewRegistry(context.Background(), sharedgrpc.FromAppConfig(cfg), log)
	if err != nil {
		_ = shutdownOtel(context.Background())
		return nil, err
	}

	redisClient, err := redisinfra.NewClient(cfg.Redis.Addr(), cfg.Redis.Password, cfg.Redis.DB)
	if err != nil {
		_ = grpcRegistry.Close()
		return nil, err
	}

	router, err := buildRouter(cfg, log, grpcRegistry, redisClient)
	if err != nil {
		_ = grpcRegistry.Close()
		_ = redisClient.Close()
		return nil, err
	}

	return &Application{
		cfg:          cfg,
		log:          log,
		grpcRegistry: grpcRegistry,
		redis:        redisClient,
		server: &nethttp.Server{
			Addr:              ":" + cfg.AppPort,
			Handler:           router,
			ReadHeaderTimeout: 5 * time.Second,
		},
		shutdownOtel: shutdownOtel,
	}, nil
}

func (app *Application) Run() error {
	defer func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if err := app.shutdownOtel(ctx); err != nil {
			app.log.Error().Err(err).Msg("shutdown tracing failed")
		}
	}()
	defer func() { _ = app.grpcRegistry.Close() }()
	defer func() { _ = app.redis.Close() }()

	errCh := make(chan error, 1)
	go func() {
		app.log.Info().Str("addr", app.server.Addr).Msg("gateway started")
		errCh <- app.server.ListenAndServe()
	}()

	stopCh := make(chan os.Signal, 1)
	signal.Notify(stopCh, syscall.SIGINT, syscall.SIGTERM)

	select {
	case sig := <-stopCh:
		app.log.Info().Str("signal", sig.String()).Msg("shutdown signal received")
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
	app.log.Info().Msg("gateway stopped")
	return nil
}

func buildRouter(cfg config.Config, log zerolog.Logger, grpcRegistry *sharedgrpc.Registry, redisClient *redis.Client) (*gin.Engine, error) {
	jwtVerifier, err := jwtinfra.NewVerifier(cfg.JWTSecret, cfg.JWTPublicKeyPath, cfg.JWTAlgorithm, redisClient)
	if err != nil {
		return nil, err
	}

	authzClient := authzgrpc.NewAuthorizationClient(grpcRegistry.Clients.Authorization)

	authService := authservice.NewAuthService(authgrpc.NewAuthClient(grpcRegistry.Clients.Auth))
	userService := userservice.NewUserService(usergrpc.NewUserClient(grpcRegistry.Clients.User))
	authHandler := authhttp.NewAuthHandler(authService)

	var avatarUploader userhttp.AvatarUploader
	if cfg.BunnyCDN.StorageZone != "" && cfg.BunnyCDN.APIKey != "" && cfg.BunnyCDN.CDNBaseURL != "" {
		bunnyClient, err := bunnycdn.NewClient(cfg.BunnyCDN.StorageZone, cfg.BunnyCDN.APIKey, cfg.BunnyCDN.StorageBaseURL, cfg.BunnyCDN.CDNBaseURL)
		if err != nil {
			log.Warn().Err(err).Msg("BunnyCDN not configured — avatar upload disabled")
		} else {
			avatarUploader = bunnyClient
		}
	}
	userHandler := userhttp.NewUserHandler(userService, avatarUploader)
	healthHandler := healthhandler.NewHandler()

	messengerProxy, err := messengerhttp.NewMessengerProxy(cfg.MessengerServiceURL)
	if err != nil {
		return nil, err
	}

	moviesProxy, err := movieshttp.NewMoviesProxy(cfg.MoviesServiceURL)
	if err != nil {
		return nil, err
	}

	musicsProxy, err := musicshttp.NewMusicsProxy(cfg.MusicsServiceURL)
	if err != nil {
		return nil, err
	}

	gin.SetMode(gin.ReleaseMode)
	router := gin.New()
	router.Use(otelgin.Middleware(logger.ServiceGateway, otelgin.WithFilter(func(req *nethttp.Request) bool {
		return req.URL.Path != "/metrics" && req.URL.Path != "/health" && req.URL.Path != "/live" && req.URL.Path != "/ready"
	})))
	httproutes.RegisterRoutes(router, httproutes.RegisterOptions{
		Logger:    log,
		Auth:      middleware.Auth(jwtVerifier),
		Timeout:   middleware.Timeout(cfg.RequestTimeout),
		RateLimit: middleware.RateLimit(cfg.RateLimitPerMin),
	},
		authhttp.NewAuthRoutes(authHandler),
		userhttp.NewUserRoutes(userHandler, authzClient),
		messengerhttp.NewMessengerRoutes(messengerProxy),
		movieshttp.NewMoviesRoutes(moviesProxy),
		musicshttp.NewMusicsRoutes(musicsProxy),
		httproutes.NewHealthRoutes(healthHandler),
		httproutes.NewMetricsRoutes(),
	)
	return router, nil
}
