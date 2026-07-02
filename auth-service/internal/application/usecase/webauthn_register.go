package usecase

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"

	"github.com/tumlumtala/auth-service/internal/application/dto"
	domainerrors "github.com/tumlumtala/auth-service/internal/domain/errors"
	"github.com/tumlumtala/auth-service/internal/domain/entity"
	"github.com/tumlumtala/auth-service/internal/domain/repository"
	webauthninfra "github.com/tumlumtala/auth-service/internal/infrastructure/webauthn"
)

type WebAuthnChallengeStore interface {
	Save(ctx context.Context, sessionID string, data []byte) error
	Get(ctx context.Context, sessionID string) ([]byte, error)
	Delete(ctx context.Context, sessionID string) error
}

type WebAuthnRegistrationUseCase struct {
	users      repository.UserQueryRepository
	creds      repository.WebAuthnCredentialStore
	challenges WebAuthnChallengeStore
	wa         *webauthninfra.Service
}

func NewWebAuthnRegistrationUseCase(
	users repository.UserQueryRepository,
	creds repository.WebAuthnCredentialStore,
	challenges WebAuthnChallengeStore,
	wa *webauthninfra.Service,
) *WebAuthnRegistrationUseCase {
	return &WebAuthnRegistrationUseCase{users: users, creds: creds, challenges: challenges, wa: wa}
}

func (uc *WebAuthnRegistrationUseCase) Begin(ctx context.Context, input dto.WebAuthnBeginRegistrationInput) (dto.WebAuthnBeginRegistrationOutput, error) {
	user, err := uc.users.GetByUUID(ctx, input.UserUUID)
	if err != nil {
		return dto.WebAuthnBeginRegistrationOutput{}, domainerrors.ErrInvalidCredentials
	}

	existing, _ := uc.creds.GetByUserUUID(ctx, user.UUID)
	waUser := &webauthninfra.WebAuthnUser{User: user, Credentials: existing}

	optionsJSON, sessionJSON, err := uc.wa.BeginRegistration(waUser)
	if err != nil {
		return dto.WebAuthnBeginRegistrationOutput{}, err
	}

	if err := uc.challenges.Save(ctx, input.SessionID, sessionJSON); err != nil {
		return dto.WebAuthnBeginRegistrationOutput{}, err
	}

	return dto.WebAuthnBeginRegistrationOutput{OptionsJSON: optionsJSON}, nil
}

func (uc *WebAuthnRegistrationUseCase) Finish(ctx context.Context, input dto.WebAuthnFinishRegistrationInput) error {
	user, err := uc.users.GetByUUID(ctx, input.UserUUID)
	if err != nil {
		return domainerrors.ErrInvalidCredentials
	}

	sessionJSON, err := uc.challenges.Get(ctx, input.SessionID)
	if err != nil {
		return domainerrors.ErrInvalidToken
	}
	_ = uc.challenges.Delete(ctx, input.SessionID)

	existing, _ := uc.creds.GetByUserUUID(ctx, user.UUID)
	waUser := &webauthninfra.WebAuthnUser{User: user, Credentials: existing}

	r, err := http.NewRequestWithContext(ctx, http.MethodPost, "/", bytes.NewReader(input.RawResponseJSON))
	if err != nil {
		return err
	}
	r.Header.Set("Content-Type", "application/json")

	cred, err := uc.wa.FinishRegistration(waUser, sessionJSON, r)
	if err != nil {
		return err
	}

	// Each account has exactly one biometric credential: replace any previous one.
	if err := uc.creds.DeleteByUserUUID(ctx, user.UUID); err != nil {
		return err
	}

	transportsJSON, _ := json.Marshal(cred.Transport)
	return uc.creds.Save(ctx, &entity.WebAuthnCredential{
		UserUUID:       user.UUID,
		CredentialID:   cred.ID,
		PublicKey:      cred.PublicKey,
		AAGUID:         cred.Authenticator.AAGUID,
		SignCount:      cred.Authenticator.SignCount,
		Transports:     string(transportsJSON),
		BackupEligible: cred.Flags.BackupEligible,
		BackupState:    cred.Flags.BackupState,
	})
}
