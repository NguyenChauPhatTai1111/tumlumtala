package module

import (
	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

type MetricsModule struct{}

func NewMetricsModule() *MetricsModule {
	return &MetricsModule{}
}

func (m *MetricsModule) RegisterPublicRoutes(_ *gin.RouterGroup) {}

func (m *MetricsModule) RegisterInternalRoutes(router *gin.RouterGroup) {
	router.GET("/metrics", gin.WrapH(promhttp.Handler()))
}
