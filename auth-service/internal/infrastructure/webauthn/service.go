package webauthninfra

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"

	"github.com/go-webauthn/webauthn/protocol"
	"github.com/go-webauthn/webauthn/webauthn"
)

// Service wraps go-webauthn and exposes Begin/Finish for registration and login.
type Service struct {
	wa *webauthn.WebAuthn
}

func NewService() (*Service, error) {
	rpID := os.Getenv("WEBAUTHN_RP_ID")
	if rpID == "" {
		rpID = "localhost"
	}
	rpOrigin := os.Getenv("WEBAUTHN_RP_ORIGIN")
	if rpOrigin == "" {
		rpOrigin = "http://localhost:3000"
	}
	rpDisplayName := os.Getenv("WEBAUTHN_RP_DISPLAY_NAME")
	if rpDisplayName == "" {
		rpDisplayName = "TumLumTala"
	}

	wa, err := webauthn.New(&webauthn.Config{
		RPDisplayName: rpDisplayName,
		RPID:          rpID,
		RPOrigins:     []string{rpOrigin},
	})
	if err != nil {
		return nil, fmt.Errorf("init webauthn: %w", err)
	}
	return &Service{wa: wa}, nil
}

// BeginRegistration returns PublicKeyCredentialCreationOptions JSON and serialised session.
func (s *Service) BeginRegistration(user *WebAuthnUser) (optionsJSON []byte, sessionJSON []byte, err error) {
	options, session, err := s.wa.BeginRegistration(user,
		webauthn.WithAuthenticatorSelection(protocol.AuthenticatorSelection{
			// Require platform authenticator (Face ID / Touch ID) instead of security keys.
			AuthenticatorAttachment: protocol.Platform,
			// Resident (discoverable) key required so login can identify the user from the
			// credential alone, without asking for an email first.
			RequireResidentKey: protocol.ResidentKeyRequired(),
			ResidentKey:        protocol.ResidentKeyRequirementRequired,
			UserVerification:   protocol.VerificationRequired,
		}),
	)
	if err != nil {
		return nil, nil, err
	}
	optionsJSON, err = json.Marshal(options.Response)
	if err != nil {
		return nil, nil, err
	}
	sessionJSON, err = json.Marshal(session)
	if err != nil {
		return nil, nil, err
	}
	return optionsJSON, sessionJSON, nil
}

// FinishRegistration parses the credential response and returns a raw webauthn.Credential.
func (s *Service) FinishRegistration(user *WebAuthnUser, sessionJSON []byte, r *http.Request) (*webauthn.Credential, error) {
	var session webauthn.SessionData
	if err := json.Unmarshal(sessionJSON, &session); err != nil {
		return nil, err
	}
	return s.wa.FinishRegistration(user, session, r)
}

// BeginLogin returns PublicKeyCredentialRequestOptions JSON and serialised session.
func (s *Service) BeginLogin(user *WebAuthnUser) (optionsJSON []byte, sessionJSON []byte, err error) {
	options, session, err := s.wa.BeginLogin(user,
		webauthn.WithUserVerification(protocol.VerificationRequired),
	)
	if err != nil {
		return nil, nil, err
	}
	optionsJSON, err = json.Marshal(options.Response)
	if err != nil {
		return nil, nil, err
	}
	sessionJSON, err = json.Marshal(session)
	if err != nil {
		return nil, nil, err
	}
	return optionsJSON, sessionJSON, nil
}

// FinishLogin verifies the assertion and returns the matched credential.
func (s *Service) FinishLogin(user *WebAuthnUser, sessionJSON []byte, r *http.Request) (*webauthn.Credential, error) {
	var session webauthn.SessionData
	if err := json.Unmarshal(sessionJSON, &session); err != nil {
		return nil, err
	}
	return s.wa.FinishLogin(user, session, r)
}

// BeginDiscoverableLogin returns PublicKeyCredentialRequestOptions JSON for a usernameless
// (discoverable credential) login, where the authenticator itself picks the credential.
func (s *Service) BeginDiscoverableLogin() (optionsJSON []byte, sessionJSON []byte, err error) {
	options, session, err := s.wa.BeginDiscoverableLogin(
		webauthn.WithUserVerification(protocol.VerificationRequired),
	)
	if err != nil {
		return nil, nil, err
	}
	optionsJSON, err = json.Marshal(options.Response)
	if err != nil {
		return nil, nil, err
	}
	sessionJSON, err = json.Marshal(session)
	if err != nil {
		return nil, nil, err
	}
	return optionsJSON, sessionJSON, nil
}

// FinishDiscoverableLogin verifies a usernameless assertion, resolving the owning user via handler.
func (s *Service) FinishDiscoverableLogin(handler webauthn.DiscoverableUserHandler, sessionJSON []byte, r *http.Request) (*WebAuthnUser, *webauthn.Credential, error) {
	var session webauthn.SessionData
	if err := json.Unmarshal(sessionJSON, &session); err != nil {
		return nil, nil, err
	}
	var resolved *WebAuthnUser
	wrapped := func(rawID, userHandle []byte) (webauthn.User, error) {
		user, err := handler(rawID, userHandle)
		if err != nil {
			return nil, err
		}
		resolved = user.(*WebAuthnUser)
		return user, nil
	}
	cred, err := s.wa.FinishDiscoverableLogin(wrapped, session, r)
	if err != nil {
		return nil, nil, err
	}
	return resolved, cred, nil
}
