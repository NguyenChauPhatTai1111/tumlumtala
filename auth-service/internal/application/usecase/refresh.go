package usecase

import (
	"context"
	"strings"
	"time"

	"github.com/tumlumtala/auth-service/internal/application/dto"
	"github.com/tumlumtala/auth-service/internal/domain/entity"
	domainerrors "github.com/tumlumtala/auth-service/internal/domain/errors"
	"github.com/tumlumtala/auth-service/internal/domain/repository"
)

const refreshTokenTTL = 7 * 24 * time.Hour

type RefreshTokenUseCase struct {
	sessions      repository.SessionStore
	tokenVersions repository.TokenVersionStore
	tokens        TokenIssuer
}

func NewRefreshTokenUseCase(
	sessions repository.SessionStore,
	tokenVersions repository.TokenVersionStore,
	tokens TokenIssuer,
) *RefreshTokenUseCase {
	return &RefreshTokenUseCase{sessions: sessions, tokenVersions: tokenVersions, tokens: tokens}
}

func (uc *RefreshTokenUseCase) Execute(ctx context.Context, input dto.RefreshInput) (dto.TokenPair, error) {
	input.RefreshToken = strings.TrimSpace(input.RefreshToken)
	if input.RefreshToken == "" {
		return dto.TokenPair{}, domainerrors.ErrInvalidInput
	}

	// parse + verify chữ ký, lấy jti
	jti, err := uc.tokens.ParseRefreshJTI(input.RefreshToken)
	if err != nil {
		return dto.TokenPair{}, domainerrors.ErrInvalidToken
	}

	// lookup session bằng jti (O(1))
	session, err := uc.sessions.Get(ctx, jti)
	if err != nil {
		return dto.TokenPair{}, domainerrors.ErrInvalidToken
	}

	// xóa session cũ (rotation)
	if err := uc.sessions.Delete(ctx, jti); err != nil {
		return dto.TokenPair{}, err
	}

	tokenVersion, err := uc.tokenVersions.Get(ctx, session.UserUUID)
	if err != nil {
		return dto.TokenPair{}, err
	}

	user := &entity.User{
		UUID:  session.UserUUID,
		Email: session.Email,
		Role:  session.Role,
	}

	accessToken, _, err := uc.tokens.IssueAccessToken(user, tokenVersion)
	if err != nil {
		return dto.TokenPair{}, err
	}

	newRefreshToken, newClaims, err := uc.tokens.IssueRefreshToken(user)
	if err != nil {
		return dto.TokenPair{}, err
	}

	newSession := entity.Session{
		UserUUID: session.UserUUID,
		Email:    session.Email,
		Role:     session.Role,
	}
	if err := uc.sessions.Save(ctx, newClaims.JTI, newSession, refreshTokenTTL); err != nil {
		return dto.TokenPair{}, err
	}

	return dto.TokenPair{AccessToken: accessToken, RefreshToken: newRefreshToken}, nil
}
