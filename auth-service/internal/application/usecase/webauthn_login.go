package usecase

import (
	"bytes"
	"context"
	"net/http"

	"github.com/go-webauthn/webauthn/webauthn"
	"github.com/tumlumtala/auth-service/internal/application/dto"
	domainerrors "github.com/tumlumtala/auth-service/internal/domain/errors"
	"github.com/tumlumtala/auth-service/internal/domain/entity"
	"github.com/tumlumtala/auth-service/internal/domain/repository"
	webauthninfra "github.com/tumlumtala/auth-service/internal/infrastructure/webauthn"
)

type WebAuthnLoginUseCase struct {
	users         repository.UserQueryRepository
	creds         repository.WebAuthnCredentialStore
	challenges    WebAuthnChallengeStore
	sessions      repository.SessionStore
	tokenVersions repository.TokenVersionStore
	tokens        TokenIssuer
	wa            *webauthninfra.Service
}

func NewWebAuthnLoginUseCase(
	users repository.UserQueryRepository,
	creds repository.WebAuthnCredentialStore,
	challenges WebAuthnChallengeStore,
	sessions repository.SessionStore,
	tokenVersions repository.TokenVersionStore,
	tokens TokenIssuer,
	wa *webauthninfra.Service,
) *WebAuthnLoginUseCase {
	return &WebAuthnLoginUseCase{
		users:         users,
		creds:         creds,
		challenges:    challenges,
		sessions:      sessions,
		tokenVersions: tokenVersions,
		tokens:        tokens,
		wa:            wa,
	}
}

func (uc *WebAuthnLoginUseCase) Begin(ctx context.Context, input dto.WebAuthnBeginLoginInput) (dto.WebAuthnBeginLoginOutput, error) {
	// Usernameless (Face ID first) flow: the authenticator itself picks the resident
	// credential, so no email is needed to start the ceremony.
	if input.Email == "" {
		optionsJSON, sessionJSON, err := uc.wa.BeginDiscoverableLogin()
		if err != nil {
			return dto.WebAuthnBeginLoginOutput{}, err
		}
		if err := uc.challenges.Save(ctx, input.SessionID, sessionJSON); err != nil {
			return dto.WebAuthnBeginLoginOutput{}, err
		}
		return dto.WebAuthnBeginLoginOutput{OptionsJSON: optionsJSON}, nil
	}

	user, err := uc.users.GetByEmail(ctx, input.Email)
	if err != nil {
		return dto.WebAuthnBeginLoginOutput{}, domainerrors.ErrInvalidCredentials
	}

	creds, err := uc.creds.GetByUserUUID(ctx, user.UUID)
	if err != nil || len(creds) == 0 {
		return dto.WebAuthnBeginLoginOutput{}, domainerrors.ErrInvalidCredentials
	}

	waUser := &webauthninfra.WebAuthnUser{User: user, Credentials: creds}
	optionsJSON, sessionJSON, err := uc.wa.BeginLogin(waUser)
	if err != nil {
		return dto.WebAuthnBeginLoginOutput{}, err
	}

	if err := uc.challenges.Save(ctx, input.SessionID, sessionJSON); err != nil {
		return dto.WebAuthnBeginLoginOutput{}, err
	}

	return dto.WebAuthnBeginLoginOutput{OptionsJSON: optionsJSON}, nil
}

func (uc *WebAuthnLoginUseCase) Finish(ctx context.Context, input dto.WebAuthnFinishLoginInput) (dto.TokenPair, error) {
	sessionJSON, err := uc.challenges.Get(ctx, input.SessionID)
	if err != nil {
		return dto.TokenPair{}, domainerrors.ErrInvalidToken
	}
	_ = uc.challenges.Delete(ctx, input.SessionID)

	r, err := http.NewRequestWithContext(ctx, http.MethodPost, "/", bytes.NewReader(input.RawResponseJSON))
	if err != nil {
		return dto.TokenPair{}, err
	}
	r.Header.Set("Content-Type", "application/json")

	var user *entity.User
	var updatedCred *webauthn.Credential

	if input.Email == "" {
		// Usernameless: resolve the user from the credential's userHandle (the WebAuthn UUID).
		handler := func(rawID, userHandle []byte) (webauthn.User, error) {
			cred, err := uc.creds.GetByCredentialID(ctx, rawID)
			if err != nil {
				return nil, domainerrors.ErrInvalidCredentials
			}
			u, err := uc.users.GetByUUID(ctx, cred.UserUUID)
			if err != nil {
				return nil, domainerrors.ErrInvalidCredentials
			}
			if u.Status != "" && u.Status != "active" {
				return nil, domainerrors.ErrInvalidCredentials
			}
			return &webauthninfra.WebAuthnUser{User: u, Credentials: []*entity.WebAuthnCredential{cred}}, nil
		}

		resolvedUser, cred, err := uc.wa.FinishDiscoverableLogin(handler, sessionJSON, r)
		if err != nil {
			return dto.TokenPair{}, err
		}
		user = resolvedUser.User
		updatedCred = cred
	} else {
		u, err := uc.users.GetByEmail(ctx, input.Email)
		if err != nil {
			return dto.TokenPair{}, domainerrors.ErrInvalidCredentials
		}
		if u.Status != "" && u.Status != "active" {
			return dto.TokenPair{}, domainerrors.ErrInvalidCredentials
		}

		creds, err := uc.creds.GetByUserUUID(ctx, u.UUID)
		if err != nil || len(creds) == 0 {
			return dto.TokenPair{}, domainerrors.ErrInvalidCredentials
		}

		waUser := &webauthninfra.WebAuthnUser{User: u, Credentials: creds}
		cred, err := uc.wa.FinishLogin(waUser, sessionJSON, r)
		if err != nil {
			return dto.TokenPair{}, err
		}
		user = u
		updatedCred = cred
	}

	// Update sign count to defend against cloned authenticators.
	_ = uc.creds.UpdateSignCount(ctx, updatedCred.ID, updatedCred.Authenticator.SignCount)

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
