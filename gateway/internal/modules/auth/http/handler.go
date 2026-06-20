package http

import (
	"context"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/tumlumtala/gateway/internal/interfaces/http/response"
	"github.com/tumlumtala/gateway/internal/modules/auth/domain"
	"github.com/tumlumtala/gateway/internal/shared/validator"
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

	token, err := h.service.Login(c.Request.Context(), domain.LoginInput{
		Email:    req.Email,
		Password: req.Password,
	})
	if err != nil {
		response.Error(c, err)
		return
	}

	response.OK(c, http.StatusOK, gin.H{
		"access_token":  token.AccessToken,
		"refresh_token": token.RefreshToken,
	})
}

func (h *AuthHandler) Refresh(c *gin.Context) {
	var req RefreshTokenRequest
	if err := validator.BindJSON(c, &req); err != nil {
		response.Error(c, err)
		return
	}

	token, err := h.service.RefreshToken(c.Request.Context(), domain.RefreshInput{RefreshToken: req.RefreshToken})
	if err != nil {
		response.Error(c, err)
		return
	}

	response.OK(c, http.StatusOK, gin.H{
		"access_token":  token.AccessToken,
		"refresh_token": token.RefreshToken,
	})
}

func (h *AuthHandler) Logout(c *gin.Context) {
	var req LogoutRequest
	if err := validator.BindJSON(c, &req); err != nil {
		response.Error(c, err)
		return
	}

	if err := h.service.Logout(c.Request.Context(), domain.LogoutInput{RefreshToken: req.RefreshToken}); err != nil {
		response.Error(c, err)
		return
	}

	response.OK(c, http.StatusOK, gin.H{"logged_out": true})
}
