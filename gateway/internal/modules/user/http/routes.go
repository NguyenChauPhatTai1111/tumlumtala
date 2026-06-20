package http

import "github.com/gin-gonic/gin"

type UserRoutes struct {
	userController *UserHandler
}

func NewUserRoutes(userController *UserHandler) *UserRoutes {
	return &UserRoutes{userController: userController}
}

func (r *UserRoutes) RegisterPublic(router *gin.RouterGroup) {
	user := router.Group("/user")
	{
		user.POST("", r.userController.CreateUser)
	}

	users := router.Group("/users")
	{
		users.GET("", r.userController.ListUsers)
		users.POST("", r.userController.CreateUser)
	}
}

func (r *UserRoutes) Register(router *gin.RouterGroup) {
	user := router.Group("/user")
	{
		user.GET("/profile", r.userController.Me)
	}

	router.GET("/me", r.userController.Me)
}

func (r *UserRoutes) RegisterInternal(_ *gin.RouterGroup) {}
