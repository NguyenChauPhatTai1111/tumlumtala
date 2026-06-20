package router

import (
	"log/slog"

	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	healthhandler "github.com/tumlumtala/gateway/internal/interfaces/health"
	httphandler "github.com/tumlumtala/gateway/internal/interfaces/http/handler"
	"github.com/tumlumtala/gateway/internal/middleware"
)

type Config struct {
	Logger         *slog.Logger
	AuthHandler    *httphandler.AuthHandler
	HealthHandler  *healthhandler.Handler
	AuthMiddleware gin.HandlerFunc
	Timeout        gin.HandlerFunc
	RateLimit      gin.HandlerFunc
}

func New(cfg Config) *gin.Engine {
	gin.SetMode(gin.ReleaseMode)
	engine := gin.New()
	engine.Use(
		middleware.RequestID(),
		middleware.Trace(),
		middleware.Logger(cfg.Logger),
		middleware.CORS(),
		middleware.Recovery(cfg.Logger),
		cfg.Timeout,
		cfg.RateLimit,
	)

	engine.GET("/health", cfg.HealthHandler.Health)
	engine.GET("/ready", cfg.HealthHandler.Ready)
	engine.GET("/live", cfg.HealthHandler.Live)
	engine.GET("/metrics", gin.WrapH(promhttp.Handler()))

	v1 := engine.Group("/api/v1")
	{
		authGroup := v1.Group("/auth")
		authGroup.POST("/login", cfg.AuthHandler.Login)
		authGroup.POST("/refresh", cfg.AuthHandler.Refresh)
		authGroup.POST("/logout", cfg.AuthHandler.Logout)

		v1.GET("/me", cfg.AuthMiddleware, cfg.AuthHandler.Me)
	}

	return engine
}
