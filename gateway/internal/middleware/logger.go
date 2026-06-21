package middleware

import (
	"time"

	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog"
	"github.com/tumlumtala/gateway/internal/shared/logger"
	"github.com/tumlumtala/gateway/internal/shared/metrics"
)

func Logger(base zerolog.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		startedAt := time.Now()

		ctx := logger.WithRequestFields(c.Request.Context(), base)
		c.Request = c.Request.WithContext(ctx)

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
		if isNoisyInternalPath(c.Request.URL.Path) {
			return
		}

		log := logger.FromContext(c.Request.Context(), base)
		event := log.Info()
		if status >= 500 {
			event = log.Error()
		} else if status >= 400 {
			event = log.Warn()
		}

		event.
			Str("component", "http").
			Str("method", c.Request.Method).
			Str("route", path).
			Str("path", c.Request.URL.Path).
			Int("status", status).
			Dur("latency", latency).
			Int64("latency_ms", latency.Milliseconds()).
			Str("ip", c.ClientIP()).
			Str("user_agent", c.Request.UserAgent()).
			Msg("http request")
	}
}

func isNoisyInternalPath(path string) bool {
	switch path {
	case "/metrics", "/health", "/live", "/ready":
		return true
	default:
		return false
	}
}
