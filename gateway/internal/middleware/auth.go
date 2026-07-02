package middleware

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	jwtinfra "github.com/tumlumtala/gateway/internal/infrastructure/jwt"
	"github.com/tumlumtala/gateway/internal/interfaces/http/response"
	"github.com/tumlumtala/gateway/internal/modules/user/domain"
	"github.com/tumlumtala/gateway/internal/shared/contextx"
)

type ActiveUserChecker interface {
	GetUser(context.Context, string) (domain.User, error)
}

const userStatusCacheTTL = 60 * time.Second
const userStatusCachePrefix = "auth:user:"

type cachedUser struct {
	Fullname string `json:"fullname"`
	Status   string `json:"status"`
}

// CachedUserChecker wraps an ActiveUserChecker with Redis caching to avoid
// a gRPC round-trip to users-service on every authenticated request.
type CachedUserChecker struct {
	inner ActiveUserChecker
	redis *redis.Client
}

func NewCachedUserChecker(inner ActiveUserChecker, redisClient *redis.Client) ActiveUserChecker {
	return &CachedUserChecker{inner: inner, redis: redisClient}
}

func (c *CachedUserChecker) GetUser(ctx context.Context, uuid string) (domain.User, error) {
	key := userStatusCachePrefix + uuid

	if val, err := c.redis.Get(ctx, key).Bytes(); err == nil {
		var cached cachedUser
		if json.Unmarshal(val, &cached) == nil {
			return domain.User{Fullname: cached.Fullname, Status: cached.Status}, nil
		}
	}

	user, err := c.inner.GetUser(ctx, uuid)
	if err != nil {
		return user, err
	}

	if data, merr := json.Marshal(cachedUser{Fullname: user.Fullname, Status: user.Status}); merr == nil {
		_ = c.redis.Set(ctx, key, data, userStatusCacheTTL).Err()
	}
	return user, nil
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
		userName := ""
		if users != nil {
			user, err := users.GetUser(c.Request.Context(), claims.UserID)
			status := strings.ToLower(strings.TrimSpace(user.Status))
			if err != nil || status == "inactive" {
				reason := "account inactive"
				if err != nil {
					reason = "get user error: " + err.Error()
				} else {
					reason = "status=" + user.Status + " userID=" + claims.UserID
				}
				response.ErrorCode(c, http.StatusUnauthorized, "UNAUTHORIZED", reason)
				c.Abort()
				return
			}
			userName = user.Fullname
		}

		ctx := contextx.WithClaims(c.Request.Context(), claims)
		c.Request = c.Request.WithContext(ctx)
		c.Set("user_id", claims.UserID)
		c.Set("email", claims.Email)
		c.Set("user_name", userName)
		c.Set("role", claims.Role)
		c.Next()
	}
}
