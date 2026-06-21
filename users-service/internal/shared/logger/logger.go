package logger

import (
	"context"
	"io"
	"os"
	"strings"
	"time"

	"github.com/rs/zerolog"
	"go.opentelemetry.io/otel/trace"
)

const (
	ServiceUsers = "users-service"

	TraceIDField   = "trace_id"
	RequestIDField = "request_id"
	SpanIDField    = "span_id"

	MetadataTraceID   = "x-trace-id"
	MetadataRequestID = "x-request-id"
)

type Config struct {
	Service      string
	Environment  string
	Version      string
	Level        string
	Output       string
	EnableCaller bool
	Writer       io.Writer
}

type contextKey string

const loggerContextKey contextKey = "logger"

func New(cfg Config) zerolog.Logger {
	zerolog.SetGlobalLevel(parseLevel(cfg.Level))
	zerolog.TimeFieldFormat = time.RFC3339Nano

	writer := cfg.Writer
	if writer == nil {
		writer = os.Stdout
	}
	if isPrettyOutput(cfg.Output, cfg.Environment) {
		writer = zerolog.ConsoleWriter{Out: writer, TimeFormat: time.RFC3339}
	}

	service := cfg.Service
	if service == "" {
		service = ServiceUsers
	}
	env := cfg.Environment
	if env == "" {
		env = "local"
	}
	version := cfg.Version
	if version == "" {
		version = "local"
	}

	log := zerolog.New(writer).
		With().
		Timestamp().
		Str("service", service).
		Str("env", env).
		Str("version", version).
		Logger()

	if cfg.EnableCaller {
		log = log.With().Caller().Logger()
	}

	return log
}

func Nop() zerolog.Logger {
	return zerolog.Nop()
}

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

func WithRequestFields(ctx context.Context, base zerolog.Logger, requestID string) context.Context {
	spanContext := trace.SpanContextFromContext(ctx)
	logContext := base.With()
	if spanContext.HasTraceID() {
		logContext = logContext.Str(TraceIDField, spanContext.TraceID().String())
	}
	if spanContext.HasSpanID() {
		logContext = logContext.Str(SpanIDField, spanContext.SpanID().String())
	}
	if requestID != "" {
		logContext = logContext.Str(RequestIDField, requestID)
	}
	return WithContext(ctx, logContext.Logger())
}

func parseLevel(level string) zerolog.Level {
	switch strings.ToLower(strings.TrimSpace(level)) {
	case "debug":
		return zerolog.DebugLevel
	case "info", "":
		return zerolog.InfoLevel
	case "warn", "warning":
		return zerolog.WarnLevel
	case "error":
		return zerolog.ErrorLevel
	case "fatal":
		return zerolog.FatalLevel
	case "panic":
		return zerolog.PanicLevel
	case "disabled", "off":
		return zerolog.Disabled
	default:
		return zerolog.InfoLevel
	}
}

func isPrettyOutput(output string, environment string) bool {
	output = strings.ToLower(strings.TrimSpace(output))
	environment = strings.ToLower(strings.TrimSpace(environment))
	return output == "text" || output == "pretty" || environment == "dev" || environment == "development"
}
