package usecase

import (
	"context"
	"strings"

	"github.com/tumlumtala/auth-service/internal/application/dto"
	domainerrors "github.com/tumlumtala/auth-service/internal/domain/errors"
	"github.com/tumlumtala/auth-service/internal/domain/repository"
)

type LogoutUseCase struct {
	sessions repository.SessionStore
	tokens   TokenIssuer
}

func NewLogoutUseCase(sessions repository.SessionStore, tokens TokenIssuer) *LogoutUseCase {
	return &LogoutUseCase{sessions: sessions, tokens: tokens}
}

func (uc *LogoutUseCase) Execute(ctx context.Context, input dto.LogoutInput) error {
	input.RefreshToken = strings.TrimSpace(input.RefreshToken)
	if input.RefreshToken == "" {
		return domainerrors.ErrInvalidInput
	}

	jti, err := uc.tokens.ParseRefreshJTI(input.RefreshToken)
	if err != nil {
		return domainerrors.ErrInvalidToken
	}

	if err := uc.sessions.Delete(ctx, jti); err != nil {
		return domainerrors.ErrSessionNotFound
	}

	return nil
}
