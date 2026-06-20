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
	router.POST("/users", r.userController.CreateUser)
}

func (r *UserRoutes) Register(router *gin.RouterGroup) {
	router.GET("/me", r.userController.Me)

	canRead := middleware.Authorize(r.authz, "user-service", "user", "read")
	canUpdate := middleware.Authorize(r.authz, "user-service", "user", "update")
	canDelete := middleware.Authorize(r.authz, "user-service", "user", "delete")

	users := router.Group("/users")
	{
		users.GET("", canRead, r.userController.ListUsers)
		users.GET("/:uuid", canRead, r.userController.GetUser)
		users.PUT("/:uuid", canUpdate, r.userController.UpdateUser)
		users.DELETE("/:uuid", canDelete, r.userController.DeleteUser)
	}
}

func (r *UserRoutes) RegisterInternal(_ *gin.RouterGroup) {}
