package http

import (
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	wsadapter "github.com/tumlumtala/messenger-service/internal/adapter/websocket"
	ws "github.com/tumlumtala/messenger-service/internal/infrastructure/websocket"
	"github.com/tumlumtala/messenger-service/internal/shared/middleware"
)

type MessengerRoutes struct {
	handler   *MessengerHandler
	wsHandler *wsadapter.Handler
	pool      *ws.ConnectionPool
	hub       *ws.Hub
	db        *gorm.DB
	jwtSecret string
}

func NewMessengerRoutes(
	handler *MessengerHandler,
	wsHandler *wsadapter.Handler,
	pool *ws.ConnectionPool,
	hub *ws.Hub,
	db *gorm.DB,
	jwtSecret string,
) *MessengerRoutes {
	return &MessengerRoutes{
		handler:   handler,
		wsHandler: wsHandler,
		pool:      pool,
		hub:       hub,
		db:        db,
		jwtSecret: jwtSecret,
	}
}

// Register registers all authenticated HTTP messenger routes on the given router group.
func (r *MessengerRoutes) Register(router *gin.RouterGroup) {
	auth := middleware.AuthMiddleware(r.db)
	group := router.Group("/messenger", auth)

	// Emoji & Sticker & Theme — gateway đã verify JWT, không cần verify lại
	router.GET("/emoji", r.handler.GetEmojis)
	router.GET("/emoji-pack", r.handler.GetEmojiPacks)
	router.GET("/sticker", r.handler.GetStickers)
	router.GET("/sticker-pack", r.handler.GetStickerPacks)
	router.GET("/theme", r.handler.GetThemes)

	// Conversation routes
	group.POST("/conversations", r.handler.CreateConversation)
	group.GET("/conversations", r.handler.GetConversations)
	group.PATCH("/conversations/:conversation_id/name", r.handler.RenameConversation)
	group.POST("/conversations/:conversation_id/members", r.handler.AddMembers)
	group.DELETE("/conversations/:conversation_id/members/:user_id", r.handler.RemoveMember)
	group.GET("/conversations/:conversation_id/members", r.handler.GetParticipants)
	group.PATCH("/conversations/:conversation_id/background", r.handler.ChangeBackground)
	group.PATCH("/conversations/:conversation_id/quick-reaction", r.handler.SetQuickReaction)
	group.PATCH("/conversations/:conversation_id/avatar", r.handler.ChangeAvatar)
	group.PATCH("/conversations/:conversation_id/notifications", r.handler.ToggleNotifications)
	group.PATCH("/conversations/:conversation_id/nickname/:target_user_id", r.handler.SetNickname)
	group.POST("/conversations/:conversation_id/leave", r.handler.LeaveGroup)
	group.GET("/conversations/:conversation_id/messages", r.handler.GetMessages)
	group.GET("/conversations/:conversation_id/messages/search", r.handler.SearchMessages)
	group.POST("/conversations/:conversation_id/archive", r.handler.ArchiveConversation)
	group.POST("/conversations/:conversation_id/restore", r.handler.RestoreConversation)
	group.DELETE("/conversations/:conversation_id", r.handler.DeleteConversation)
	group.POST("/conversations/:conversation_id/read", r.handler.MarkRead)

	// Message routes
	group.POST("/messages", r.handler.SendMessage)
	group.POST("/messages/upload", r.handler.UploadMessageAttachment)
	group.GET("/messages/search", r.handler.SearchAllMessages)
	group.GET("/messages/:message_id/history", r.handler.GetMessageHistory)
	group.PATCH("/messages/:message_id", r.handler.UpdateMessage)
	group.DELETE("/messages/:message_id", r.handler.DeleteMessage)
	group.POST("/messages/:message_id/reactions", r.handler.SetReaction)
	group.DELETE("/messages/:message_id/reactions", r.handler.RemoveReaction)
}

// RegisterInfra registers the WebSocket upgrade endpoint on the engine directly (no auth middleware —
// the ServeWS function validates the JWT itself via query param or header).
func (r *MessengerRoutes) RegisterInfra(engine *gin.Engine) {
	validateToken := ws.ParseUserIDFromToken(r.jwtSecret, r.db)
	engine.GET(
		"/ws/messenger",
		gin.WrapF(ws.ServeWS(r.pool, r.hub, r.wsHandler, validateToken)),
	)
}
