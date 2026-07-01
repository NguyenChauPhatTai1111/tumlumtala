package webauthninfra

import (
	"encoding/json"

	"github.com/go-webauthn/webauthn/webauthn"
	"github.com/tumlumtala/auth-service/internal/domain/entity"
)

// WebAuthnUser adapts our entity.User + credentials to satisfy the webauthn.User interface.
type WebAuthnUser struct {
	User        *entity.User
	Credentials []*entity.WebAuthnCredential
}

func (u *WebAuthnUser) WebAuthnID() []byte {
	return []byte(u.User.UUID)
}

func (u *WebAuthnUser) WebAuthnName() string {
	return u.User.Email
}

func (u *WebAuthnUser) WebAuthnDisplayName() string {
	if u.User.Fullname != "" {
		return u.User.Fullname
	}
	return u.User.Email
}

func (u *WebAuthnUser) WebAuthnCredentials() []webauthn.Credential {
	creds := make([]webauthn.Credential, 0, len(u.Credentials))
	for _, c := range u.Credentials {
		var transports []string
		if c.Transports != "" {
			_ = json.Unmarshal([]byte(c.Transports), &transports)
		}
		cred := webauthn.Credential{
			ID:        c.CredentialID,
			PublicKey: c.PublicKey,
			Authenticator: webauthn.Authenticator{
				AAGUID:     c.AAGUID,
				SignCount:  c.SignCount,
			},
			Flags: webauthn.CredentialFlags{
				BackupEligible: c.BackupEligible,
				BackupState:    c.BackupState,
			},
		}
		creds = append(creds, cred)
	}
	return creds
}
