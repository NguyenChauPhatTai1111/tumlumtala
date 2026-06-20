package errors

import "errors"

var (
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrInvalidToken       = errors.New("invalid or expired token")
	ErrSessionNotFound    = errors.New("session not found")
	ErrInvalidInput       = errors.New("invalid input")
)
