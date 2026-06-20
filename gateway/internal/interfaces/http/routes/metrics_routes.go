package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

type MetricsRoutes struct{}

func NewMetricsRoutes() *MetricsRoutes {
	return &MetricsRoutes{}
}

func (r *MetricsRoutes) RegisterPublic(_ *gin.RouterGroup) {}

func (r *MetricsRoutes) Register(_ *gin.RouterGroup) {}

func (r *MetricsRoutes) RegisterInternal(router *gin.RouterGroup) {
	router.GET("/metrics", gin.WrapH(promhttp.Handler()))
}
