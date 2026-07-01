package queryservice

import (
	"context"
	"time"

	domainerrors "github.com/tumlumtala/auth-service/internal/domain/errors"
	"github.com/tumlumtala/auth-service/internal/domain/entity"
	"github.com/tumlumtala/auth-service/internal/infrastructure/persistence/model"
	"gorm.io/gorm"
)

type MySQLWebAuthnCredentialStore struct{ db *gorm.DB }

func NewMySQLWebAuthnCredentialStore(db *gorm.DB) *MySQLWebAuthnCredentialStore {
	return &MySQLWebAuthnCredentialStore{db: db}
}

func (r *MySQLWebAuthnCredentialStore) Save(ctx context.Context, cred *entity.WebAuthnCredential) error {
	m := &model.WebAuthnCredential{
		UserUUID:       cred.UserUUID,
		CredentialID:   cred.CredentialID,
		PublicKey:      cred.PublicKey,
		AAGUID:         cred.AAGUID,
		SignCount:      cred.SignCount,
		Transports:     cred.Transports,
		BackupEligible: cred.BackupEligible,
		BackupState:    cred.BackupState,
		CreatedAt:      time.Now(),
		LastUsedAt:     time.Now(),
	}
	return r.db.WithContext(ctx).Create(m).Error
}

func (r *MySQLWebAuthnCredentialStore) GetByUserUUID(ctx context.Context, userUUID string) ([]*entity.WebAuthnCredential, error) {
	var ms []*model.WebAuthnCredential
	if err := r.db.WithContext(ctx).Where("user_uuid = ?", userUUID).Find(&ms).Error; err != nil {
		return nil, err
	}
	out := make([]*entity.WebAuthnCredential, len(ms))
	for i, m := range ms {
		out[i] = m.ToEntity()
	}
	return out, nil
}

func (r *MySQLWebAuthnCredentialStore) GetByCredentialID(ctx context.Context, credentialID []byte) (*entity.WebAuthnCredential, error) {
	var m model.WebAuthnCredential
	if err := r.db.WithContext(ctx).Where("credential_id = ?", credentialID).First(&m).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, domainerrors.ErrInvalidCredentials
		}
		return nil, err
	}
	return m.ToEntity(), nil
}

func (r *MySQLWebAuthnCredentialStore) UpdateSignCount(ctx context.Context, credentialID []byte, newCount uint32) error {
	return r.db.WithContext(ctx).
		Model(&model.WebAuthnCredential{}).
		Where("credential_id = ?", credentialID).
		Updates(map[string]any{
			"sign_count":   newCount,
			"last_used_at": time.Now(),
		}).Error
}
