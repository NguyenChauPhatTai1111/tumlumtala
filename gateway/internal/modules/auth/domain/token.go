package domain

import "time"

type LoginInput struct {
	Email    string
	Password string
}

type RefreshInput struct {
	RefreshToken string
}

type LogoutInput struct {
	RefreshToken string
}

type TokenPair struct {
	AccessToken  string
	RefreshToken string
}

// WebAuthn domain types

type WebAuthnBeginRegistrationInput struct {
	UserUUID  string
	SessionID string
}

type WebAuthnBeginRegistrationOutput struct {
	OptionsJSON []byte
}

type WebAuthnFinishRegistrationInput struct {
	UserUUID        string
	SessionID       string
	RawResponseJSON []byte
}

type WebAuthnBeginLoginInput struct {
	Email     string
	SessionID string
}

type WebAuthnBeginLoginOutput struct {
	OptionsJSON []byte
}

type WebAuthnFinishLoginInput struct {
	Email           string
	SessionID       string
	RawResponseJSON []byte
}

type AccessClaims struct {
	UserID       string
	Email        string
	Role         string
	TokenType    string
	JTI          string
	TokenVersion int64
	IssuedAt     time.Time
	ExpiresAt    time.Time
}
