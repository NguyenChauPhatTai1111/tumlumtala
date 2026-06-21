package http

import (
	"context"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/tumlumtala/gateway/internal/interfaces/http/response"
	"github.com/tumlumtala/gateway/internal/modules/user/domain"
	"github.com/tumlumtala/gateway/internal/shared/contextx"
	"github.com/tumlumtala/gateway/internal/shared/logger"
	"github.com/tumlumtala/gateway/internal/shared/observability"
	"github.com/tumlumtala/gateway/internal/shared/validator"
)

type UserService interface {
	CreateUser(context.Context, domain.CreateUserInput) (domain.User, error)
	GetUser(context.Context, string) (domain.User, error)
	ListUsers(context.Context, domain.ListUsersInput) (domain.ListUsersResult, error)
	UpdateUser(context.Context, domain.UpdateUserInput) (domain.User, error)
	DeleteUser(context.Context, string) error
}

type UserHandler struct {
	service UserService
}

func NewUserHandler(service UserService) *UserHandler {
	return &UserHandler{service: service}
}

func (h *UserHandler) CreateUser(c *gin.Context) {
	var user domain.User
	err := observability.Trace(c.Request.Context(), "UserHTTPController.CreateUser", func(ctx context.Context) error {
		c.Request = c.Request.WithContext(ctx)

		var req CreateUserRequest
		if err := validator.BindJSON(c, &req); err != nil {
			return err
		}

		createdUser, err := h.service.CreateUser(ctx, domain.CreateUserInput{
			Email:    req.Email,
			Password: req.Password,
			Fullname: req.Fullname,
		})
		if err != nil {
			return err
		}
		user = createdUser
		return nil
	},
		observability.AttrServiceName(logger.ServiceGateway),
		observability.AttrLayer("controller"),
		observability.AttrOperation("create_user"),
		observability.AttrResourceType("user"),
	)
	if err != nil {
		response.Error(c, err)
		return
	}

	response.OK(c, http.StatusCreated, mapUser(user))
}

func (h *UserHandler) GetUser(c *gin.Context) {
	uuid := c.Param("uuid")

	user, err := h.service.GetUser(c.Request.Context(), uuid)
	if err != nil {
		response.Error(c, err)
		return
	}

	response.OK(c, http.StatusOK, mapUser(user))
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
		users = append(users, mapUser(item))
	}

	response.OK(c, http.StatusOK, gin.H{
		"users":  users,
		"total":  result.Total,
		"limit":  limit,
		"offset": offset,
	})
}

func (h *UserHandler) UpdateUser(c *gin.Context) {
	uuid := c.Param("uuid")

	var req UpdateUserRequest
	if err := validator.BindJSON(c, &req); err != nil {
		response.Error(c, err)
		return
	}

	user, err := h.service.UpdateUser(c.Request.Context(), domain.UpdateUserInput{
		UUID:     uuid,
		Email:    req.Email,
		Fullname: req.Fullname,
		Role:     req.Role,
	})
	if err != nil {
		response.Error(c, err)
		return
	}

	response.OK(c, http.StatusOK, mapUser(user))
}

func (h *UserHandler) DeleteUser(c *gin.Context) {
	uuid := c.Param("uuid")

	if err := h.service.DeleteUser(c.Request.Context(), uuid); err != nil {
		response.Error(c, err)
		return
	}

	response.OK(c, http.StatusOK, gin.H{"deleted": true})
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

func mapUser(u domain.User) gin.H {
	return gin.H{
		"id":         u.ID,
		"uuid":       u.UUID,
		"email":      u.Email,
		"fullname":   u.Fullname,
		"role":       u.Role,
		"created_at": u.CreatedAt,
		"updated_at": u.UpdatedAt,
	}
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
