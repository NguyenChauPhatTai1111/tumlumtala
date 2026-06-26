package http

import (
	"context"

	"github.com/gin-gonic/gin"
	"github.com/tumlumtala/gateway/internal/middleware"
)

type AuthorizationChecker interface {
	Check(ctx context.Context, userUUID, service, resource, action string) (bool, string, error)
}

type UserRoutes struct {
	userController *UserHandler
	authz          AuthorizationChecker
}

func NewUserRoutes(userController *UserHandler, authz AuthorizationChecker) *UserRoutes {
	return &UserRoutes{userController: userController, authz: authz}
}

func (r *UserRoutes) RegisterPublic(router *gin.RouterGroup) {
	users := router.Group("/users")
	{
		users.GET("", r.userController.ListUsers)
		users.POST("", r.userController.CreateUser)
	}
}

func (r *UserRoutes) Register(router *gin.RouterGroup) {
	router.GET("/me", r.userController.Me)
	router.PUT("/me", r.userController.UpdateMe)
	router.POST("/me/avatar", r.userController.UploadAvatar)

	canRead := middleware.Authorize(r.authz, "user-service", "user", "read")
	canUpdate := middleware.Authorize(r.authz, "user-service", "user", "update")
	canUpdateStatus := middleware.Authorize(r.authz, "user-service", "user.status", "update")
	canDelete := middleware.Authorize(r.authz, "user-service", "user", "delete")

	users := router.Group("/users")
	{
		users.PATCH("/:uuid/status", canUpdateStatus, r.userController.ChangeUserStatus)
		users.PUT("/:uuid/status", canUpdateStatus, r.userController.ChangeUserStatus)
		users.GET("/:uuid", canRead, r.userController.GetUser)
		users.PUT("/:uuid", canUpdate, r.userController.UpdateUser)
		users.DELETE("/:uuid", canDelete, r.userController.DeleteUser)
	}

	legacyUser := router.Group("/user")
	{
		legacyUser.PATCH("/status/:uuid", canUpdateStatus, r.userController.ChangeUserStatus)
		legacyUser.PUT("/status/:uuid", canUpdateStatus, r.userController.ChangeUserStatus)
	}
}

func (r *UserRoutes) RegisterInternal(_ *gin.RouterGroup) {}
