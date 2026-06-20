package middleware

import (
	"log/slog"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/tumlumtala/gateway/internal/shared/contextx"
	"github.com/tumlumtala/gateway/internal/shared/metrics"
)

func Logger(logger *slog.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		startedAt := time.Now()
		c.Next()
		latency := time.Since(startedAt)
		status := c.Writer.Status()
		path := c.FullPath()
		if path == "" {
			path = c.Request.URL.Path
		}

		statusLabel := metrics.StatusLabel(status)
		metrics.HTTPRequestCount.WithLabelValues(c.Request.Method, path, statusLabel).Inc()
		metrics.HTTPRequestDuration.WithLabelValues(c.Request.Method, path, statusLabel).Observe(latency.Seconds())

		logger.InfoContext(c.Request.Context(), "http request",
			slog.String("trace_id", contextx.TraceID(c.Request.Context())),
			slog.String("request_id", contextx.RequestID(c.Request.Context())),
			slog.String("method", c.Request.Method),
			slog.String("path", c.Request.URL.Path),
			slog.Int("status", status),
			slog.Int64("latency_ms", latency.Milliseconds()),
			slog.String("ip", c.ClientIP()),
			slog.String("user_agent", c.Request.UserAgent()),
		)
	}
}
