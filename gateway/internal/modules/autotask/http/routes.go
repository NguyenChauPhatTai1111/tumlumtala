package http

import "github.com/gin-gonic/gin"

type Routes struct {
	handler *Handler
}

func NewRoutes(handler *Handler) *Routes {
	return &Routes{handler: handler}
}

func (r *Routes) RegisterPublic(_ *gin.RouterGroup) {}

func (r *Routes) Register(router *gin.RouterGroup) {
	at := router.Group("/autotask")
	at.POST("/fetch-title", r.handler.FetchTitle)
}
