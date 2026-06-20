package routes

import (
	"log/slog"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/tumlumtala/gateway/internal/interfaces/http/response"
	"github.com/tumlumtala/gateway/internal/middleware"
)

type Route interface {
	Register(router *gin.RouterGroup)
}

type PublicRoute interface {
	RegisterPublic(router *gin.RouterGroup)
}

type InternalRoute interface {
	RegisterInternal(router *gin.RouterGroup)
}

type RegisterOptions struct {
	Logger    *slog.Logger
	Auth      gin.HandlerFunc
	Timeout   gin.HandlerFunc
	RateLimit gin.HandlerFunc
}

func RegisterRoutes(engine *gin.Engine, opts RegisterOptions, routes ...Route) {
	engine.Use(
		middleware.RequestID(),
		middleware.Trace(),
		middleware.Logger(opts.Logger),
		middleware.CORS(),
		middleware.Recovery(opts.Logger),
		opts.Timeout,
		opts.RateLimit,
	)

	v1 := engine.Group("/api/v1")
	publicGroup := v1.Group("")
	authenticatedGroup := v1.Group("")
	authenticatedGroup.Use(opts.Auth)
	internalGroup := engine.Group("")

	for _, route := range routes {
		if publicRoute, ok := route.(PublicRoute); ok {
			publicRoute.RegisterPublic(publicGroup)
		}

		route.Register(authenticatedGroup)

		if internalRoute, ok := route.(InternalRoute); ok {
			internalRoute.RegisterInternal(internalGroup)
		}
	}

	engine.NoRoute(func(ctx *gin.Context) {
		response.ErrorCode(ctx, http.StatusNotFound, "NOT_FOUND", "route not found")
	})
}
