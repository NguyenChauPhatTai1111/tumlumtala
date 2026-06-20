package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/tumlumtala/gateway/internal/interfaces/http/response"
)

type rateState struct {
	count     int
	resetTime time.Time
}

func RateLimit(limitPerMinute int) gin.HandlerFunc {
	var mu sync.Mutex
	clients := make(map[string]rateState)

	return func(c *gin.Context) {
		if limitPerMinute <= 0 {
			c.Next()
			return
		}

		now := time.Now()
		ip := c.ClientIP()
		mu.Lock()
		state := clients[ip]
		if state.resetTime.IsZero() || now.After(state.resetTime) {
			state = rateState{resetTime: now.Add(time.Minute)}
		}
		state.count++
		clients[ip] = state
		allowed := state.count <= limitPerMinute
		mu.Unlock()

		if !allowed {
			response.ErrorCode(c, http.StatusTooManyRequests, "TOO_MANY_REQUESTS", "too many requests")
			c.Abort()
			return
		}

		c.Next()
	}
}
