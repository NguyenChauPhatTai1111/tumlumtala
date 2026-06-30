package http

import (
	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

type Routes struct {
	handler *Handler
}

func NewRoutes(
	redisClient *redis.Client,
	dictionaryDirectory, llmURL, llmKey, llmModel string,
) (*Routes, error) {
	validator, err := newLexiconValidator(
		dictionaryDirectory,
		newGroqValidator(llmURL, llmKey, llmModel),
	)
	if err != nil {
		return nil, err
	}
	return &Routes{handler: newHandler(newHub(validator, redisClient))}, nil
}

func (r *Routes) Register(router *gin.RouterGroup) {
	group := router.Group("/word-chain")
	group.GET("/rooms", r.handler.listRooms)
	group.POST("/rooms", r.handler.createRoom)
	group.GET("/rooms/:room_id", r.handler.roomState)
	group.POST("/rooms/:room_id/join", r.handler.joinRoom)
	group.DELETE("/rooms/:room_id/members/me", r.handler.leaveRoom)
	group.POST("/rooms/:room_id/ws-ticket", r.handler.createTicket)
	group.GET("/leaderboard", r.handler.leaderboard)
}

func (r *Routes) RegisterInternal(router *gin.RouterGroup) {
	router.GET("/ws/word-chain", r.handler.serveWS)
}
