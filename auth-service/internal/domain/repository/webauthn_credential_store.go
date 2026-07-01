package repository

import (
	"context"

	"github.com/tumlumtala/auth-service/internal/domain/entity"
)

type WebAuthnCredentialStore interface {
	Save(ctx context.Context, cred *entity.WebAuthnCredential) error
	GetByUserUUID(ctx context.Context, userUUID string) ([]*entity.WebAuthnCredential, error)
	GetByCredentialID(ctx context.Context, credentialID []byte) (*entity.WebAuthnCredential, error)
	UpdateSignCount(ctx context.Context, credentialID []byte, newCount uint32) error
}
