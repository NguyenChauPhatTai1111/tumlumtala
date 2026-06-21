package middleware

import (
	"github.com/gin-gonic/gin"
	"github.com/tumlumtala/gateway/internal/shared/contextx"
	"github.com/tumlumtala/gateway/internal/shared/id"
	"github.com/tumlumtala/gateway/internal/shared/logger"
)

const RequestIDHeader = logger.HeaderRequestID

func RequestID() gin.HandlerFunc {
	return func(c *gin.Context) {
		requestID := c.GetHeader(RequestIDHeader)
		if requestID == "" {
			requestID = id.New()
		}

		c.Header(RequestIDHeader, requestID)
		ctx := contextx.WithRequestID(c.Request.Context(), requestID)
		c.Request = c.Request.WithContext(ctx)
		c.Set("request_id", requestID)
		c.Next()
	}
}
