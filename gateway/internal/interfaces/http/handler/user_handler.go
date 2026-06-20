package handler

import (
	"context"
	"net/http"

	"github.com/gin-gonic/gin"
	userdomain "github.com/tumlumtala/gateway/internal/domain/user"
	"github.com/tumlumtala/gateway/internal/interfaces/http/request"
	"github.com/tumlumtala/gateway/internal/interfaces/http/response"
	"github.com/tumlumtala/gateway/internal/shared/contextx"
	"github.com/tumlumtala/gateway/internal/shared/validator"
)

type UserService interface {
	CreateUser(context.Context, userdomain.CreateUserInput) (userdomain.User, error)
	GetMe(context.Context, string) (map[string]any, error)
}

type UserHandler struct {
	service UserService
}

func NewUserHandler(service UserService) *UserHandler {
	return &UserHandler{service: service}
}

func (h *UserHandler) CreateUser(c *gin.Context) {
	var req request.CreateUserRequest
	if err := validator.BindJSON(c, &req); err != nil {
		response.Error(c, err)
		return
	}

	createdUser, err := h.service.CreateUser(c.Request.Context(), userdomain.CreateUserInput{
		Email:    req.Email,
		Password: req.Password,
		Fullname: req.Fullname,
	})
	if err != nil {
		response.Error(c, err)
		return
	}

	response.OK(c, http.StatusCreated, gin.H{
		"id":       createdUser.ID,
		"email":    createdUser.Email,
		"fullname": createdUser.Fullname,
	})
}

func (h *UserHandler) Me(c *gin.Context) {
	claims, ok := contextx.Claims(c.Request.Context())
	if !ok {
		response.ErrorCode(c, http.StatusUnauthorized, "UNAUTHORIZED", "unauthorized")
		return
	}

	response.OK(c, http.StatusOK, gin.H{
		"user_id": claims.UserID,
		"email":   claims.Email,
		"role":    claims.Role,
	})
}
