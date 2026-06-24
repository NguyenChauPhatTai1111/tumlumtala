package http

import "github.com/gin-gonic/gin"

type MusicsRoutes struct {
	proxy *MusicsProxy
}

func NewMusicsRoutes(proxy *MusicsProxy) *MusicsRoutes {
	return &MusicsRoutes{proxy: proxy}
}

func (r *MusicsRoutes) RegisterPublic(_ *gin.RouterGroup) {}

func (r *MusicsRoutes) Register(router *gin.RouterGroup) {
	router.Any("/music/*path", r.proxy.ServeHTTP)
}
