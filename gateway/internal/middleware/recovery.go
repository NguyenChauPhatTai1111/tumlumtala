package middleware

import (
	"net/http"
	"runtime/debug"

	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog"
	"github.com/tumlumtala/gateway/internal/interfaces/http/response"
	"github.com/tumlumtala/gateway/internal/shared/logger"
)

func Recovery(base zerolog.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if recovered := recover(); recovered != nil {
				log := logger.FromContext(c.Request.Context(), base)
				log.Error().
					Interface("panic", recovered).
					Bytes("stack", debug.Stack()).
					Msg("panic recovered")
				response.ErrorCode(c, http.StatusInternalServerError, "INTERNAL_ERROR", "internal error")
				c.Abort()
			}
		}()
		c.Next()
	}
}
