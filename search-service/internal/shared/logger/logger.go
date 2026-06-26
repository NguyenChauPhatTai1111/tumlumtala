package logger

import (
	"io"
	"os"
	"strings"
	"time"

	"github.com/rs/zerolog"
)

const (
	ServiceGateway = "gateway"

	TraceIDField   = "trace_id"
	RequestIDField = "request_id"
	SpanIDField    = "span_id"

	HeaderTraceID   = "X-Trace-ID"
	HeaderRequestID = "X-Request-ID"

	MetadataTraceID   = "x-trace-id"
	MetadataRequestID = "x-request-id"
)

type Config struct {
	Service      string
	Level        string
	Output       string
	Environment  string
	Version      string
	EnableCaller bool

	// Writer is mainly for tests. Production should leave this nil so logs go to stdout.
	Writer io.Writer
}

func New(cfg Config) zerolog.Logger {
	level := parseLevel(cfg.Level)
	zerolog.SetGlobalLevel(level)
	zerolog.TimeFieldFormat = time.RFC3339Nano

	writer := cfg.Writer
	if writer == nil {
		writer = os.Stdout
	}

	if isPrettyOutput(cfg.Output, cfg.Environment) {
		writer = zerolog.ConsoleWriter{
			Out:        writer,
			TimeFormat: time.RFC3339,
		}
	}

	service := cfg.Service
	if service == "" {
		service = ServiceGateway
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
