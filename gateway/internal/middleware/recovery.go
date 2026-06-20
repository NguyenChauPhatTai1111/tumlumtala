package middleware

import (
	"log/slog"
	"net/http"
	"runtime/debug"

	"github.com/gin-gonic/gin"
	"github.com/tumlumtala/gateway/internal/interfaces/http/response"
	"github.com/tumlumtala/gateway/internal/shared/contextx"
)

func Recovery(logger *slog.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if recovered := recover(); recovered != nil {
				logger.ErrorContext(c.Request.Context(), "panic recovered",
					slog.String("trace_id", contextx.TraceID(c.Request.Context())),
					slog.String("request_id", contextx.RequestID(c.Request.Context())),
					slog.Any("panic", recovered),
					slog.String("stack", string(debug.Stack())),
				)
				response.ErrorCode(c, http.StatusInternalServerError, "INTERNAL_ERROR", "internal error")
				c.Abort()
			}
		}()
		c.Next()
	}
}
