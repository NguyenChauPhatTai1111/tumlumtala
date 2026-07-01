package model

import (
	"time"

	"github.com/tumlumtala/auth-service/internal/domain/entity"
)

type WebAuthnCredential struct {
	ID             uint64    `gorm:"primaryKey;autoIncrement;column:id"`
	UserUUID       string    `gorm:"column:user_uuid;not null;index"`
	CredentialID   []byte    `gorm:"column:credential_id;not null;uniqueIndex"`
	PublicKey      []byte    `gorm:"column:public_key;not null"`
	AAGUID         []byte    `gorm:"column:aaguid"`
	SignCount      uint32    `gorm:"column:sign_count;default:0"`
	Transports     string    `gorm:"column:transports;type:text"`
	BackupEligible bool      `gorm:"column:backup_eligible;default:false"`
	BackupState    bool      `gorm:"column:backup_state;default:false"`
	CreatedAt      time.Time `gorm:"column:created_at;precision:6"`
	LastUsedAt     time.Time `gorm:"column:last_used_at;precision:6"`
}

func (WebAuthnCredential) TableName() string { return "webauthn_credentials" }

func (m *WebAuthnCredential) ToEntity() *entity.WebAuthnCredential {
	return &entity.WebAuthnCredential{
		ID:             m.ID,
		UserUUID:       m.UserUUID,
		CredentialID:   m.CredentialID,
		PublicKey:      m.PublicKey,
		AAGUID:         m.AAGUID,
		SignCount:      m.SignCount,
		Transports:     m.Transports,
		BackupEligible: m.BackupEligible,
		BackupState:    m.BackupState,
		CreatedAt:      m.CreatedAt,
		LastUsedAt:     m.LastUsedAt,
	}
}
