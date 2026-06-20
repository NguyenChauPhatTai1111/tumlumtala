package router

import (
	"log/slog"

	"github.com/gin-gonic/gin"
	"github.com/tumlumtala/gateway/internal/middleware"
)

type Config struct {
	Logger    *slog.Logger
	Timeout   gin.HandlerFunc
	RateLimit gin.HandlerFunc
	Modules   []Module
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

	public := engine.Group("/api/v1")
	internal := engine.Group("")
	RegisterModules(public, internal, cfg.Modules...)

	return engine
}
