package errors

import "errors"

var (
	ErrUserNotFound = errors.New("user not found")
	ErrDenied       = errors.New("permission denied")
)
