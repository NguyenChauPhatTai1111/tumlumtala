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

	// Purge expired entries every minute to prevent unbounded memory growth.
	go func() {
		ticker := time.NewTicker(time.Minute)
		defer ticker.Stop()
		for range ticker.C {
			now := time.Now()
			mu.Lock()
			for ip, state := range clients {
				if now.After(state.resetTime) {
					delete(clients, ip)
				}
			}
			mu.Unlock()
		}
	}()

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
