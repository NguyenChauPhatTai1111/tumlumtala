package usecase

import (
	"context"
	"strings"

	"github.com/tumlumtala/auth-service/internal/application/dto"
	"github.com/tumlumtala/auth-service/internal/domain/entity"
	domainerrors "github.com/tumlumtala/auth-service/internal/domain/errors"
	"github.com/tumlumtala/auth-service/internal/domain/repository"
	jwtinfra "github.com/tumlumtala/auth-service/internal/infrastructure/jwt"
)

type TokenIssuer interface {
	IssueAccessToken(user *entity.User, tokenVersion int64) (token string, claims jwtinfra.IssuedClaims, err error)
	IssueRefreshToken(user *entity.User) (token string, claims jwtinfra.IssuedClaims, err error)
	ParseRefreshJTI(token string) (jti string, err error)
}

type PasswordVerifier interface {
	Verify(hashed, plain string) bool
}

type LoginUseCase struct {
	users         repository.UserQueryRepository
	sessions      repository.SessionStore
	tokenVersions repository.TokenVersionStore
	tokens        TokenIssuer
	password      PasswordVerifier
}

func NewLoginUseCase(
	users repository.UserQueryRepository,
	sessions repository.SessionStore,
	tokenVersions repository.TokenVersionStore,
	tokens TokenIssuer,
	password PasswordVerifier,
) *LoginUseCase {
	return &LoginUseCase{
		users:         users,
		sessions:      sessions,
		tokenVersions: tokenVersions,
		tokens:        tokens,
		password:      password,
	}
}

func (uc *LoginUseCase) Execute(ctx context.Context, input dto.LoginInput) (dto.TokenPair, error) {
	input.Email = strings.ToLower(strings.TrimSpace(input.Email))
	if input.Email == "" || input.Password == "" {
		return dto.TokenPair{}, domainerrors.ErrInvalidInput
	}

	user, err := uc.users.GetByEmail(ctx, input.Email)
	if err != nil {
		return dto.TokenPair{}, domainerrors.ErrInvalidCredentials
	}
	if !uc.password.Verify(user.Password, input.Password) {
		return dto.TokenPair{}, domainerrors.ErrInvalidCredentials
	}

	tokenVersion, err := uc.tokenVersions.Get(ctx, user.UUID)
	if err != nil {
		return dto.TokenPair{}, err
	}

	accessToken, _, err := uc.tokens.IssueAccessToken(user, tokenVersion)
	if err != nil {
		return dto.TokenPair{}, err
	}

	refreshToken, refreshClaims, err := uc.tokens.IssueRefreshToken(user)
	if err != nil {
		return dto.TokenPair{}, err
	}

	session := entity.Session{
		UserUUID: user.UUID,
		Email:    user.Email,
		Role:     user.Role,
	}
	if err := uc.sessions.Save(ctx, refreshClaims.JTI, session, refreshTokenTTL); err != nil {
		return dto.TokenPair{}, err
	}

	return dto.TokenPair{AccessToken: accessToken, RefreshToken: refreshToken}, nil
}
