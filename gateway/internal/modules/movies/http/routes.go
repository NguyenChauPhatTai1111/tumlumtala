package http

import "github.com/gin-gonic/gin"

type MoviesRoutes struct {
	proxy *MoviesProxy
}

func NewMoviesRoutes(proxy *MoviesProxy) *MoviesRoutes {
	return &MoviesRoutes{proxy: proxy}
}

// RegisterPublic proxies all movie endpoints without auth middleware.
// certifications/batch and seasons are truly public; the movies-service
// enforces its own JWT check on the authenticated sub-routes.
func (r *MoviesRoutes) RegisterPublic(router *gin.RouterGroup) {
	router.Any("/movie/*path", r.proxy.ServeHTTP)
}

// Register is a no-op: all movie routes are handled in RegisterPublic so that
// a single wildcard avoids Gin route conflicts with overlapping patterns.
func (r *MoviesRoutes) Register(_ *gin.RouterGroup) {}
