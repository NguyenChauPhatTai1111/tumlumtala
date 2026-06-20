package auth

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

type AccessClaims struct {
	UserID    string
	Email     string
	Role      string
	TokenType string
	IssuedAt  time.Time
	ExpiresAt time.Time
}
