package routes

import (
	"github.com/gin-gonic/gin"
	healthhandler "github.com/tumlumtala/gateway/internal/interfaces/health"
)

type HealthRoutes struct {
	healthController *healthhandler.Handler
}

func NewHealthRoutes(healthController *healthhandler.Handler) *HealthRoutes {
	return &HealthRoutes{healthController: healthController}
}

func (r *HealthRoutes) RegisterPublic(_ *gin.RouterGroup) {}

func (r *HealthRoutes) Register(_ *gin.RouterGroup) {}

func (r *HealthRoutes) RegisterInternal(router *gin.RouterGroup) {
	router.GET("/health", r.healthController.Health)
	router.GET("/ready", r.healthController.Ready)
	router.GET("/live", r.healthController.Live)
}
