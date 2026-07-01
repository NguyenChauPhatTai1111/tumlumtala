package http

import (
	"context"
	"encoding/json"
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
	WebAuthnBeginRegistration(context.Context, domain.WebAuthnBeginRegistrationInput) (domain.WebAuthnBeginRegistrationOutput, error)
	WebAuthnFinishRegistration(context.Context, domain.WebAuthnFinishRegistrationInput) error
	WebAuthnBeginLogin(context.Context, domain.WebAuthnBeginLoginInput) (domain.WebAuthnBeginLoginOutput, error)
	WebAuthnFinishLogin(context.Context, domain.WebAuthnFinishLoginInput) (domain.TokenPair, error)
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

// WebAuthnBeginRegistration — POST /auth/webauthn/register/begin (authenticated)
func (h *AuthHandler) WebAuthnBeginRegistration(c *gin.Context) {
	var req WebAuthnBeginRegistrationRequest
	if err := validator.BindJSON(c, &req); err != nil {
		response.Error(c, err)
		return
	}

	out, err := h.service.WebAuthnBeginRegistration(c.Request.Context(), domain.WebAuthnBeginRegistrationInput{
		UserUUID:  req.UserUUID,
		SessionID: req.SessionID,
	})
	if err != nil {
		response.Error(c, err)
		return
	}

	// OptionsJSON is already valid JSON — return it verbatim so the browser
	// can pass it directly to navigator.credentials.create().
	var options json.RawMessage = out.OptionsJSON
	response.OK(c, http.StatusOK, gin.H{"options": options})
}

// WebAuthnFinishRegistration — POST /auth/webauthn/register/finish (authenticated)
func (h *AuthHandler) WebAuthnFinishRegistration(c *gin.Context) {
	var req WebAuthnFinishRegistrationRequest
	if err := validator.BindJSON(c, &req); err != nil {
		response.Error(c, err)
		return
	}

	credJSON, err := json.Marshal(req.Credential)
	if err != nil {
		response.ErrorCode(c, http.StatusBadRequest, "BAD_REQUEST", "invalid credential")
		return
	}

	if err := h.service.WebAuthnFinishRegistration(c.Request.Context(), domain.WebAuthnFinishRegistrationInput{
		UserUUID:        req.UserUUID,
		SessionID:       req.SessionID,
		RawResponseJSON: credJSON,
	}); err != nil {
		response.Error(c, err)
		return
	}

	response.OK(c, http.StatusOK, gin.H{"registered": true})
}

// WebAuthnBeginLogin — POST /auth/webauthn/login/begin (public)
func (h *AuthHandler) WebAuthnBeginLogin(c *gin.Context) {
	var req WebAuthnBeginLoginRequest
	if err := validator.BindJSON(c, &req); err != nil {
		response.Error(c, err)
		return
	}

	out, err := h.service.WebAuthnBeginLogin(c.Request.Context(), domain.WebAuthnBeginLoginInput{
		Email:     req.Email,
		SessionID: req.SessionID,
	})
	if err != nil {
		response.Error(c, err)
		return
	}

	var options json.RawMessage = out.OptionsJSON
	response.OK(c, http.StatusOK, gin.H{"options": options})
}

// WebAuthnFinishLogin — POST /auth/webauthn/login/finish (public)
func (h *AuthHandler) WebAuthnFinishLogin(c *gin.Context) {
	var req WebAuthnFinishLoginRequest
	if err := validator.BindJSON(c, &req); err != nil {
		response.Error(c, err)
		return
	}

	credJSON, err := json.Marshal(req.Credential)
	if err != nil {
		response.ErrorCode(c, http.StatusBadRequest, "BAD_REQUEST", "invalid credential")
		return
	}

	pair, err := h.service.WebAuthnFinishLogin(c.Request.Context(), domain.WebAuthnFinishLoginInput{
		Email:           req.Email,
		SessionID:       req.SessionID,
		RawResponseJSON: credJSON,
	})
	if err != nil {
		response.Error(c, err)
		return
	}

	setRefreshCookie(c, pair.RefreshToken)
	response.OK(c, http.StatusOK, gin.H{"access_token": pair.AccessToken})
}

func setRefreshCookie(c *gin.Context, token string) {
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie(refreshCookieName, token, int(refreshCookieTTL.Seconds()), "/", "", false, true)
}

func clearRefreshCookie(c *gin.Context) {
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie(refreshCookieName, "", -1, "/", "", false, true)
}
