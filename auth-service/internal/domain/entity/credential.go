package entity

import "time"

// WebAuthnCredential stores a passkey credential for a user.
type WebAuthnCredential struct {
	ID              uint64
	UserUUID        string
	CredentialID    []byte
	PublicKey       []byte
	AAGUID          []byte
	SignCount       uint32
	Transports      string // JSON-encoded []string
	BackupEligible  bool
	BackupState     bool
	CreatedAt       time.Time
	LastUsedAt      time.Time
}
