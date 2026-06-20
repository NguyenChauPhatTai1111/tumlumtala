package module

import (
	"github.com/gin-gonic/gin"
	httphandler "github.com/tumlumtala/gateway/internal/interfaces/http/handler"
)

type UserModule struct {
	handler        *httphandler.UserHandler
	authMiddleware gin.HandlerFunc
}

func NewUserModule(handler *httphandler.UserHandler, authMiddleware gin.HandlerFunc) *UserModule {
	return &UserModule{
		handler:        handler,
		authMiddleware: authMiddleware,
	}
}

func (m *UserModule) RegisterPublicRoutes(router *gin.RouterGroup) {
	router.POST("/user", m.handler.CreateUser)
	router.POST("/users", m.handler.CreateUser)
	router.GET("/me", m.authMiddleware, m.handler.Me)
}

func (m *UserModule) RegisterInternalRoutes(_ *gin.RouterGroup) {}
