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

		// WebAuthn public endpoints (no token required)
		webauthn := auth.Group("/webauthn")
		{
			webauthn.POST("/login/begin", r.authController.WebAuthnBeginLogin)
			webauthn.POST("/login/finish", r.authController.WebAuthnFinishLogin)
		}
	}
}

func (r *AuthRoutes) Register(router *gin.RouterGroup) {
	auth := router.Group("/auth")
	{
		// WebAuthn registration requires an authenticated user (JWT in header)
		webauthn := auth.Group("/webauthn")
		{
			webauthn.POST("/register/begin", r.authController.WebAuthnBeginRegistration)
			webauthn.POST("/register/finish", r.authController.WebAuthnFinishRegistration)
		}
	}
}

func (r *AuthRoutes) RegisterInternal(_ *gin.RouterGroup) {}
