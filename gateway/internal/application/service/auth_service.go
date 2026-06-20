package service

import (
	"context"
	"errors"
	"strings"

	authdomain "github.com/tumlumtala/gateway/internal/domain/auth"
	apperrors "github.com/tumlumtala/gateway/internal/shared/errors"
)

type AuthClient interface {
	Login(context.Context, authdomain.LoginInput) (authdomain.TokenPair, error)
	RefreshToken(context.Context, authdomain.RefreshInput) (authdomain.TokenPair, error)
	Logout(context.Context, authdomain.LogoutInput) error
}

type AuthService struct {
	authClient AuthClient
}

func NewAuthService(authClient AuthClient) *AuthService {
	return &AuthService{authClient: authClient}
}

func (s *AuthService) Login(ctx context.Context, input authdomain.LoginInput) (authdomain.TokenPair, error) {
	input.Email = strings.TrimSpace(input.Email)
	if input.Email == "" || input.Password == "" {
		return authdomain.TokenPair{}, apperrors.New(apperrors.CodeBadRequest, "email and password are required", errors.New("missing login fields"))
	}
	return s.authClient.Login(ctx, input)
}

func (s *AuthService) RefreshToken(ctx context.Context, input authdomain.RefreshInput) (authdomain.TokenPair, error) {
	input.RefreshToken = strings.TrimSpace(input.RefreshToken)
	if input.RefreshToken == "" {
		return authdomain.TokenPair{}, apperrors.New(apperrors.CodeUnauthorized, "refresh token missing", errors.New("missing refresh token"))
	}
	return s.authClient.RefreshToken(ctx, input)
}

func (s *AuthService) Logout(ctx context.Context, input authdomain.LogoutInput) error {
	input.RefreshToken = strings.TrimSpace(input.RefreshToken)
	if input.RefreshToken == "" {
		return nil
	}
	return s.authClient.Logout(ctx, input)
}
