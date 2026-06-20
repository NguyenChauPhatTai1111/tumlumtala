package middleware

import (
	"context"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/tumlumtala/gateway/internal/interfaces/http/response"
	"github.com/tumlumtala/gateway/internal/shared/contextx"
)

type AuthorizationChecker interface {
	Check(ctx context.Context, userUUID, service, resource, action string) (bool, string, error)
}

// Authorize returns a middleware that checks whether the authenticated user has
// permission <resource>.<action> in the given service via the authorization-service.
func Authorize(checker AuthorizationChecker, service, resource, action string) gin.HandlerFunc {
	return func(c *gin.Context) {
		claims, ok := contextx.Claims(c.Request.Context())
		if !ok {
			response.ErrorCode(c, http.StatusUnauthorized, "UNAUTHORIZED", "unauthorized")
			c.Abort()
			return
		}

		allowed, reason, err := checker.Check(c.Request.Context(), claims.UserID, service, resource, action)
		if err != nil {
			response.ErrorCode(c, http.StatusInternalServerError, "INTERNAL_ERROR", "authorization check failed")
			c.Abort()
			return
		}
		if !allowed {
			response.ErrorCode(c, http.StatusForbidden, "FORBIDDEN", reason)
			c.Abort()
			return
		}

		c.Next()
	}
}
