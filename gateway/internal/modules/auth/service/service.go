package service

import (
	"context"
	"errors"
	"strings"

	"github.com/tumlumtala/gateway/internal/modules/auth/domain"
	apperrors "github.com/tumlumtala/gateway/internal/shared/errors"
)

type AuthClient interface {
	Login(context.Context, domain.LoginInput) (domain.TokenPair, error)
	RefreshToken(context.Context, domain.RefreshInput) (domain.TokenPair, error)
	Logout(context.Context, domain.LogoutInput) error
}

type AuthService struct {
	authClient AuthClient
}

func NewAuthService(authClient AuthClient) *AuthService {
	return &AuthService{authClient: authClient}
}

func (s *AuthService) Login(ctx context.Context, input domain.LoginInput) (domain.TokenPair, error) {
	input.Email = strings.TrimSpace(input.Email)
	if input.Email == "" || input.Password == "" {
		return domain.TokenPair{}, apperrors.New(apperrors.CodeBadRequest, "email and password are required", errors.New("missing login fields"))
	}
	return s.authClient.Login(ctx, input)
}

func (s *AuthService) RefreshToken(ctx context.Context, input domain.RefreshInput) (domain.TokenPair, error) {
	input.RefreshToken = strings.TrimSpace(input.RefreshToken)
	if input.RefreshToken == "" {
		return domain.TokenPair{}, apperrors.New(apperrors.CodeBadRequest, "refresh_token is required", errors.New("missing refresh_token"))
	}
	return s.authClient.RefreshToken(ctx, input)
}

func (s *AuthService) Logout(ctx context.Context, input domain.LogoutInput) error {
	input.RefreshToken = strings.TrimSpace(input.RefreshToken)
	if input.RefreshToken == "" {
		return apperrors.New(apperrors.CodeBadRequest, "refresh_token is required", errors.New("missing refresh_token"))
	}
	return s.authClient.Logout(ctx, input)
}
