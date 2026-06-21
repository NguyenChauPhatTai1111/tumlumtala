package logger

import (
	"context"

	"github.com/rs/zerolog"
	"github.com/tumlumtala/gateway/internal/shared/contextx"
	"go.opentelemetry.io/otel/trace"
)

type contextKey string

const loggerContextKey contextKey = "logger"

func WithContext(ctx context.Context, log zerolog.Logger) context.Context {
	if ctx == nil {
		ctx = context.Background()
	}

	return context.WithValue(ctx, loggerContextKey, log)
}

func FromContext(ctx context.Context, fallback zerolog.Logger) zerolog.Logger {
	if ctx == nil {
		return fallback
	}

	log, ok := ctx.Value(loggerContextKey).(zerolog.Logger)
	if !ok {
		return fallback
	}

	return log
}

func WithRequestFields(ctx context.Context, base zerolog.Logger) context.Context {
	traceID := contextx.TraceID(ctx)
	requestID := contextx.RequestID(ctx)
	spanContext := trace.SpanContextFromContext(ctx)
	if spanContext.HasTraceID() {
		traceID = spanContext.TraceID().String()
	}

	logContext := base.With()
	if traceID != "" {
		logContext = logContext.Str(TraceIDField, traceID)
	}
	if spanContext.HasSpanID() {
		logContext = logContext.Str(SpanIDField, spanContext.SpanID().String())
	}
	if requestID != "" {
		logContext = logContext.Str(RequestIDField, requestID)
	}

	return WithContext(ctx, logContext.Logger())
}
