package http

import "github.com/gin-gonic/gin"

type MessengerRoutes struct {
	proxy *MessengerProxy
}

func NewMessengerRoutes(proxy *MessengerProxy) *MessengerRoutes {
	return &MessengerRoutes{proxy: proxy}
}

func (r *MessengerRoutes) RegisterPublic(router *gin.RouterGroup) {
	router.Any("/messenger-uploads/*path", r.proxy.ServeHTTP)
}

// Register proxies all authenticated /messenger/* and related resource requests to the messenger-service.
func (r *MessengerRoutes) Register(router *gin.RouterGroup) {
	messenger := router.Group("/messenger")
	messenger.Any("/*path", r.proxy.ServeHTTP)

	// Emoji, sticker, theme endpoints also served by messenger-service
	for _, prefix := range []string{"/emoji", "/emoji-pack", "/sticker", "/sticker-pack", "/theme"} {
		router.Any(prefix, r.proxy.ServeHTTP)
		router.Any(prefix+"/*path", r.proxy.ServeHTTP)
	}
}

// RegisterInternal exposes the WebSocket upgrade endpoint without the gRPC auth middleware
// (the messenger-service validates the JWT itself via query-param token).
func (r *MessengerRoutes) RegisterInternal(router *gin.RouterGroup) {
	router.GET("/ws/messenger", r.proxy.ServeWS)
}
