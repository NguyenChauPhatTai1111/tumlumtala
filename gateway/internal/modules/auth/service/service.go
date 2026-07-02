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
	WebAuthnBeginRegistration(context.Context, domain.WebAuthnBeginRegistrationInput) (domain.WebAuthnBeginRegistrationOutput, error)
	WebAuthnFinishRegistration(context.Context, domain.WebAuthnFinishRegistrationInput) error
	WebAuthnBeginLogin(context.Context, domain.WebAuthnBeginLoginInput) (domain.WebAuthnBeginLoginOutput, error)
	WebAuthnFinishLogin(context.Context, domain.WebAuthnFinishLoginInput) (domain.TokenPair, error)
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

func (s *AuthService) WebAuthnBeginRegistration(ctx context.Context, input domain.WebAuthnBeginRegistrationInput) (domain.WebAuthnBeginRegistrationOutput, error) {
	if input.UserUUID == "" || input.SessionID == "" {
		return domain.WebAuthnBeginRegistrationOutput{}, apperrors.New(apperrors.CodeBadRequest, "user_uuid and session_id are required", errors.New("missing fields"))
	}
	return s.authClient.WebAuthnBeginRegistration(ctx, input)
}

func (s *AuthService) WebAuthnFinishRegistration(ctx context.Context, input domain.WebAuthnFinishRegistrationInput) error {
	if input.UserUUID == "" || input.SessionID == "" || len(input.RawResponseJSON) == 0 {
		return apperrors.New(apperrors.CodeBadRequest, "user_uuid, session_id and credential response are required", errors.New("missing fields"))
	}
	return s.authClient.WebAuthnFinishRegistration(ctx, input)
}

func (s *AuthService) WebAuthnBeginLogin(ctx context.Context, input domain.WebAuthnBeginLoginInput) (domain.WebAuthnBeginLoginOutput, error) {
	input.Email = strings.TrimSpace(input.Email)
	if input.SessionID == "" {
		return domain.WebAuthnBeginLoginOutput{}, apperrors.New(apperrors.CodeBadRequest, "session_id is required", errors.New("missing fields"))
	}
	return s.authClient.WebAuthnBeginLogin(ctx, input)
}

func (s *AuthService) WebAuthnFinishLogin(ctx context.Context, input domain.WebAuthnFinishLoginInput) (domain.TokenPair, error) {
	input.Email = strings.TrimSpace(input.Email)
	if input.SessionID == "" || len(input.RawResponseJSON) == 0 {
		return domain.TokenPair{}, apperrors.New(apperrors.CodeBadRequest, "session_id and credential response are required", errors.New("missing fields"))
	}
	return s.authClient.WebAuthnFinishLogin(ctx, input)
}
