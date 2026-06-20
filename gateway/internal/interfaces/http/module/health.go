package module

import (
	"github.com/gin-gonic/gin"
	healthhandler "github.com/tumlumtala/gateway/internal/interfaces/health"
)

type HealthModule struct {
	handler *healthhandler.Handler
}

func NewHealthModule(handler *healthhandler.Handler) *HealthModule {
	return &HealthModule{handler: handler}
}

func (m *HealthModule) RegisterPublicRoutes(_ *gin.RouterGroup) {}

func (m *HealthModule) RegisterInternalRoutes(router *gin.RouterGroup) {
	router.GET("/health", m.handler.Health)
	router.GET("/ready", m.handler.Ready)
	router.GET("/live", m.handler.Live)
}
