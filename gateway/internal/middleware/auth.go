package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	jwtinfra "github.com/tumlumtala/gateway/internal/infrastructure/jwt"
	"github.com/tumlumtala/gateway/internal/interfaces/http/response"
	"github.com/tumlumtala/gateway/internal/shared/contextx"
)

func Auth(verifier *jwtinfra.Verifier) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if !strings.HasPrefix(header, "Bearer ") {
			response.ErrorCode(c, http.StatusUnauthorized, "UNAUTHORIZED", "unauthorized")
			c.Abort()
			return
		}

		claims, err := verifier.Verify(strings.TrimPrefix(header, "Bearer "))
		if err != nil {
			response.Error(c, err)
			c.Abort()
			return
		}

		ctx := contextx.WithClaims(c.Request.Context(), claims)
		c.Request = c.Request.WithContext(ctx)
		c.Set("user_id", claims.UserID)
		c.Set("email", claims.Email)
		c.Set("role", claims.Role)
		c.Next()
	}
}
