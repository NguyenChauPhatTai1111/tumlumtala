package module

import (
	"github.com/gin-gonic/gin"
	httphandler "github.com/tumlumtala/gateway/internal/interfaces/http/handler"
)

type AuthModule struct {
	handler *httphandler.AuthHandler
}

func NewAuthModule(handler *httphandler.AuthHandler) *AuthModule {
	return &AuthModule{handler: handler}
}

func (m *AuthModule) RegisterPublicRoutes(router *gin.RouterGroup) {
	auth := router.Group("/auth")
	auth.POST("/login", m.handler.Login)
	auth.POST("/refresh", m.handler.Refresh)
	auth.POST("/logout", m.handler.Logout)
}

func (m *AuthModule) RegisterInternalRoutes(_ *gin.RouterGroup) {}
