package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	jwtinfra "github.com/tumlumtala/gateway/internal/infrastructure/jwt"
	"github.com/tumlumtala/gateway/internal/interfaces/http/response"
	"github.com/tumlumtala/gateway/internal/modules/user/domain"
	"github.com/tumlumtala/gateway/internal/shared/contextx"
)

type ActiveUserChecker interface {
	GetUser(context.Context, string) (domain.User, error)
}

func Auth(verifier *jwtinfra.Verifier, users ActiveUserChecker) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if !strings.HasPrefix(header, "Bearer ") {
			response.ErrorCode(c, http.StatusUnauthorized, "UNAUTHORIZED", "unauthorized")
			c.Abort()
			return
		}

		claims, err := verifier.Verify(c.Request.Context(), strings.TrimPrefix(header, "Bearer "))
		if err != nil {
			response.Error(c, err)
			c.Abort()
			return
		}
		if users != nil {
			user, err := users.GetUser(c.Request.Context(), claims.UserID)
			if err != nil || user.Status != "active" {
				response.ErrorCode(c, http.StatusUnauthorized, "UNAUTHORIZED", "account inactive")
				c.Abort()
				return
			}
		}

		ctx := contextx.WithClaims(c.Request.Context(), claims)
		c.Request = c.Request.WithContext(ctx)
		c.Set("user_id", claims.UserID)
		c.Set("email", claims.Email)
		c.Set("role", claims.Role)
		c.Next()
	}
}
