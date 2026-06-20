package http

import (
	"context"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/tumlumtala/gateway/internal/interfaces/http/response"
	"github.com/tumlumtala/gateway/internal/modules/user/domain"
	"github.com/tumlumtala/gateway/internal/shared/contextx"
	"github.com/tumlumtala/gateway/internal/shared/validator"
)

type UserService interface {
	CreateUser(context.Context, domain.CreateUserInput) (domain.User, error)
	ListUsers(context.Context, domain.ListUsersInput) (domain.ListUsersResult, error)
	GetMe(context.Context, string) (map[string]any, error)
}

type UserHandler struct {
	service UserService
}

func NewUserHandler(service UserService) *UserHandler {
	return &UserHandler{service: service}
}

func (h *UserHandler) CreateUser(c *gin.Context) {
	var req CreateUserRequest
	if err := validator.BindJSON(c, &req); err != nil {
		response.Error(c, err)
		return
	}

	createdUser, err := h.service.CreateUser(c.Request.Context(), domain.CreateUserInput{
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
		"uuid":     createdUser.UUID,
		"email":    createdUser.Email,
		"fullname": createdUser.Fullname,
		"role":     createdUser.Role,
	})
}

func (h *UserHandler) ListUsers(c *gin.Context) {
	limit := parseQueryInt32(c, "limit", 10)
	offset := parseQueryInt32(c, "offset", 0)

	result, err := h.service.ListUsers(c.Request.Context(), domain.ListUsersInput{
		Limit:  limit,
		Offset: offset,
	})
	if err != nil {
		response.Error(c, err)
		return
	}

	users := make([]gin.H, 0, len(result.Users))
	for _, item := range result.Users {
		users = append(users, gin.H{
			"id":       item.ID,
			"uuid":     item.UUID,
			"email":    item.Email,
			"fullname": item.Fullname,
			"role":     item.Role,
		})
	}

	response.OK(c, http.StatusOK, gin.H{
		"users":  users,
		"total":  result.Total,
		"limit":  limit,
		"offset": offset,
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

func parseQueryInt32(c *gin.Context, key string, fallback int32) int32 {
	value := c.Query(key)
	if value == "" {
		return fallback
	}
	parsed, err := strconv.ParseInt(value, 10, 32)
	if err != nil {
		return fallback
	}
	return int32(parsed)
}
