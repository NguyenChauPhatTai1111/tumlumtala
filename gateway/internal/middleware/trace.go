package middleware

import (
	"github.com/gin-gonic/gin"
	"github.com/tumlumtala/gateway/internal/shared/contextx"
	"github.com/tumlumtala/gateway/internal/shared/id"
)

const TraceIDHeader = "X-Trace-ID"

func Trace() gin.HandlerFunc {
	return func(c *gin.Context) {
		traceID := id.New()
		c.Header(TraceIDHeader, traceID)
		ctx := contextx.WithTraceID(c.Request.Context(), traceID)
		c.Request = c.Request.WithContext(ctx)
		c.Set("trace_id", traceID)
		c.Next()
	}
}
