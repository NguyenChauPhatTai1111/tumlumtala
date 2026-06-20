package http

import "github.com/gin-gonic/gin"

type AuthRoutes struct {
	authController *AuthHandler
}

func NewAuthRoutes(authController *AuthHandler) *AuthRoutes {
	return &AuthRoutes{authController: authController}
}

func (r *AuthRoutes) RegisterPublic(router *gin.RouterGroup) {
	auth := router.Group("/auth")
	{
		auth.POST("/login", r.authController.Login)
		auth.POST("/refresh", r.authController.Refresh)
		auth.POST("/logout", r.authController.Logout)
	}
}

func (r *AuthRoutes) Register(_ *gin.RouterGroup) {}

func (r *AuthRoutes) RegisterInternal(_ *gin.RouterGroup) {}
