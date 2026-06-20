package contextx

import (
	"context"

	authdomain "github.com/tumlumtala/gateway/internal/modules/auth/domain"
)

type key string

const (
	requestIDKey key = "request_id"
	traceIDKey   key = "trace_id"
	claimsKey    key = "claims"
)

func WithRequestID(ctx context.Context, requestID string) context.Context {
	return context.WithValue(ctx, requestIDKey, requestID)
}

func RequestID(ctx context.Context) string {
	value, _ := ctx.Value(requestIDKey).(string)
	return value
}

func WithTraceID(ctx context.Context, traceID string) context.Context {
	return context.WithValue(ctx, traceIDKey, traceID)
}

func TraceID(ctx context.Context) string {
	value, _ := ctx.Value(traceIDKey).(string)
	return value
}

func WithClaims(ctx context.Context, claims authdomain.AccessClaims) context.Context {
	return context.WithValue(ctx, claimsKey, claims)
}

func Claims(ctx context.Context) (authdomain.AccessClaims, bool) {
	value, ok := ctx.Value(claimsKey).(authdomain.AccessClaims)
	return value, ok
}
