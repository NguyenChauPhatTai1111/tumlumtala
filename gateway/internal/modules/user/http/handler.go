package http

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"path"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/tumlumtala/gateway/internal/interfaces/http/response"
	"github.com/tumlumtala/gateway/internal/modules/user/domain"
	"github.com/tumlumtala/gateway/internal/shared/contextx"
	"github.com/tumlumtala/gateway/internal/shared/logger"
	"github.com/tumlumtala/gateway/internal/shared/observability"
	"github.com/tumlumtala/gateway/internal/shared/validator"
)

const maxAvatarSize = 5 << 20 // 5MB

type AvatarUploader interface {
	Upload(ctx context.Context, remotePath string, payload []byte, contentType string) (string, error)
}

type UserService interface {
	CreateUser(context.Context, domain.CreateUserInput) (domain.User, error)
	GetUser(context.Context, string) (domain.User, error)
	ListUsers(context.Context, domain.ListUsersInput) (domain.ListUsersResult, error)
	UpdateUser(context.Context, domain.UpdateUserInput) (domain.User, error)
	UpdateProfile(context.Context, domain.UpdateProfileInput) (domain.User, error)
	DeleteUser(context.Context, string) error
}

type UserHandler struct {
	service  UserService
	uploader AvatarUploader // nil when BunnyCDN is not configured
}

func NewUserHandler(service UserService, uploader AvatarUploader) *UserHandler {
	return &UserHandler{service: service, uploader: uploader}
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
	page := parseQueryInt32(c, "page", 1)
	if page < 1 {
		page = 1
	}
	offset := (page - 1) * limit
	search := c.Query("search")

	result, err := h.service.ListUsers(c.Request.Context(), domain.ListUsersInput{
		Limit:  limit,
		Offset: offset,
		Search: search,
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
		"page":   page,
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

	user, err := h.service.GetUser(c.Request.Context(), claims.UserID)
	if err != nil {
		response.Error(c, err)
		return
	}

	response.OK(c, http.StatusOK, mapUser(user))
}

func (h *UserHandler) UpdateMe(c *gin.Context) {
	claims, ok := contextx.Claims(c.Request.Context())
	if !ok {
		response.ErrorCode(c, http.StatusUnauthorized, "UNAUTHORIZED", "unauthorized")
		return
	}

	var req UpdateProfileRequest
	if err := validator.BindJSON(c, &req); err != nil {
		response.Error(c, err)
		return
	}

	user, err := h.service.UpdateProfile(c.Request.Context(), domain.UpdateProfileInput{
		UUID:     claims.UserID,
		Email:    req.Email,
		Fullname: req.Fullname,
		Avatar:   req.Avatar,
	})
	if err != nil {
		response.Error(c, err)
		return
	}

	response.OK(c, http.StatusOK, mapUser(user))
}

func (h *UserHandler) UploadAvatar(c *gin.Context) {
	if h.uploader == nil {
		response.ErrorCode(c, http.StatusServiceUnavailable, "CDN_UNAVAILABLE", "avatar upload is not configured")
		return
	}

	claims, ok := contextx.Claims(c.Request.Context())
	if !ok {
		response.ErrorCode(c, http.StatusUnauthorized, "UNAUTHORIZED", "unauthorized")
		return
	}

	fileHeader, err := c.FormFile("file")
	if err != nil {
		response.ErrorCode(c, http.StatusBadRequest, "BAD_REQUEST", "file is required")
		return
	}
	if fileHeader.Size > maxAvatarSize {
		response.ErrorCode(c, http.StatusBadRequest, "BAD_REQUEST", "file too large: max 5MB")
		return
	}

	src, err := fileHeader.Open()
	if err != nil {
		response.ErrorCode(c, http.StatusBadRequest, "BAD_REQUEST", "cannot open file")
		return
	}
	defer src.Close()

	raw, err := io.ReadAll(io.LimitReader(src, maxAvatarSize+1))
	if err != nil {
		response.ErrorCode(c, http.StatusInternalServerError, "INTERNAL", "cannot read file")
		return
	}

	mimeType := http.DetectContentType(raw)
	ext, valid := avatarExtByMime(mimeType)
	if !valid {
		response.ErrorCode(c, http.StatusBadRequest, "BAD_REQUEST", "only JPEG, PNG, and WebP images are allowed")
		return
	}

	shortID := strings.ReplaceAll(uuid.NewString(), "-", "")[:8]
	filename := fmt.Sprintf("%d_%s%s", time.Now().Unix(), shortID, ext)
	remotePath := path.Join("users", "avatars", filename)

	cdnURL, err := h.uploader.Upload(c.Request.Context(), remotePath, raw, mimeType)
	if err != nil {
		response.ErrorCode(c, http.StatusInternalServerError, "UPLOAD_FAILED", "failed to upload avatar")
		return
	}

	user, err := h.service.UpdateProfile(c.Request.Context(), domain.UpdateProfileInput{
		UUID:   claims.UserID,
		Avatar: cdnURL,
	})
	if err != nil {
		response.Error(c, err)
		return
	}

	response.OK(c, http.StatusOK, mapUser(user))
}

func avatarExtByMime(mimeType string) (string, bool) {
	switch mimeType {
	case "image/jpeg":
		return ".jpg", true
	case "image/png":
		return ".png", true
	case "image/webp":
		return ".webp", true
	default:
		return "", false
	}
}

func mapUser(u domain.User) gin.H {
	return gin.H{
		"id":         u.ID,
		"uuid":       u.UUID,
		"email":      u.Email,
		"fullname":   u.Fullname,
		"avatar":     u.Avatar,
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
