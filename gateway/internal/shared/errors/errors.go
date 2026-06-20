package errors

import (
	"errors"
	nethttp "net/http"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

const (
	CodeBadRequest      = "BAD_REQUEST"
	CodeUnauthorized    = "UNAUTHORIZED"
	CodeForbidden       = "FORBIDDEN"
	CodeNotFound        = "NOT_FOUND"
	CodeTimeout         = "TIMEOUT"
	CodeUnavailable     = "SERVICE_UNAVAILABLE"
	CodeInternal        = "INTERNAL_ERROR"
	CodeTooManyRequests = "TOO_MANY_REQUESTS"
)

type AppError struct {
	Code    string
	Message string
	Cause   error
}

func (e *AppError) Error() string {
	return e.Message
}

func (e *AppError) Unwrap() error {
	return e.Cause
}

func New(code, message string, cause error) *AppError {
	return &AppError{Code: code, Message: message, Cause: cause}
}

func FromError(err error) *AppError {
	if err == nil {
		return nil
	}
	var appErr *AppError
	if errors.As(err, &appErr) {
		return appErr
	}
	return New(CodeInternal, "internal error", err)
}

func FromGRPC(err error) *AppError {
	if err == nil {
		return nil
	}

	switch status.Code(err) {
	case codes.InvalidArgument, codes.FailedPrecondition, codes.OutOfRange:
		return New(CodeBadRequest, status.Convert(err).Message(), err)
	case codes.Unauthenticated:
		return New(CodeUnauthorized, "unauthorized", err)
	case codes.PermissionDenied:
		return New(CodeForbidden, "forbidden", err)
	case codes.NotFound:
		return New(CodeNotFound, "not found", err)
	case codes.DeadlineExceeded:
		return New(CodeTimeout, "request timeout", err)
	case codes.Unavailable, codes.ResourceExhausted:
		return New(CodeUnavailable, "service unavailable", err)
	default:
		return New(CodeInternal, "internal error", err)
	}
}

func HTTPStatus(err *AppError) int {
	switch err.Code {
	case CodeBadRequest:
		return nethttp.StatusBadRequest
	case CodeUnauthorized:
		return nethttp.StatusUnauthorized
	case CodeForbidden:
		return nethttp.StatusForbidden
	case CodeNotFound:
		return nethttp.StatusNotFound
	case CodeTimeout:
		return nethttp.StatusGatewayTimeout
	case CodeUnavailable:
		return nethttp.StatusServiceUnavailable
	case CodeTooManyRequests:
		return nethttp.StatusTooManyRequests
	default:
		return nethttp.StatusInternalServerError
	}
}
