package http

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/tumlumtala/gateway/internal/interfaces/http/response"
	"github.com/tumlumtala/gateway/internal/modules/auth/domain"
	"github.com/tumlumtala/gateway/internal/shared/contextx"
	"github.com/tumlumtala/gateway/internal/shared/validator"
)

const (
	refreshCookieName = "refresh_token"
	refreshCookieTTL  = 7 * 24 * time.Hour
)

type AuthService interface {
	Login(context.Context, domain.LoginInput) (domain.TokenPair, error)
	RefreshToken(context.Context, domain.RefreshInput) (domain.TokenPair, error)
	Logout(context.Context, domain.LogoutInput) error
}

type AuthHandler struct {
	service AuthService
}

func NewAuthHandler(service AuthService) *AuthHandler {
	return &AuthHandler{service: service}
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := validator.BindJSON(c, &req); err != nil {
		response.Error(c, err)
		return
	}

	pair, err := h.service.Login(c.Request.Context(), domain.LoginInput{
		Email:    req.Email,
		Password: req.Password,
	})
	if err != nil {
		response.Error(c, err)
		return
	}

	setRefreshCookie(c, pair.RefreshToken)
	response.OK(c, http.StatusOK, gin.H{"access_token": pair.AccessToken})
}

func (h *AuthHandler) Refresh(c *gin.Context) {
	refreshToken, err := c.Cookie(refreshCookieName)
	if err != nil || refreshToken == "" {
		response.ErrorCode(c, http.StatusUnauthorized, "UNAUTHORIZED", "refresh token cookie missing")
		return
	}

	pair, err := h.service.RefreshToken(c.Request.Context(), domain.RefreshInput{RefreshToken: refreshToken})
	if err != nil {
		clearRefreshCookie(c)
		response.Error(c, err)
		return
	}

	setRefreshCookie(c, pair.RefreshToken)
	response.OK(c, http.StatusOK, gin.H{"access_token": pair.AccessToken})
}

func (h *AuthHandler) Logout(c *gin.Context) {
	refreshToken, _ := c.Cookie(refreshCookieName)
	if refreshToken == "" {
		clearRefreshCookie(c)
		response.OK(c, http.StatusOK, gin.H{"logged_out": true})
		return
	}

	if err := h.service.Logout(c.Request.Context(), domain.LogoutInput{RefreshToken: refreshToken}); err != nil {
		response.Error(c, err)
		return
	}

	clearRefreshCookie(c)
	response.OK(c, http.StatusOK, gin.H{"logged_out": true})
}

func (h *AuthHandler) Me(c *gin.Context) {
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

func setRefreshCookie(c *gin.Context, token string) {
	c.SetSameSite(http.SameSiteStrictMode)
	c.SetCookie(refreshCookieName, token, int(refreshCookieTTL.Seconds()), "/", "", false, true)
}

func clearRefreshCookie(c *gin.Context) {
	c.SetSameSite(http.SameSiteStrictMode)
	c.SetCookie(refreshCookieName, "", -1, "/", "", false, true)
}
