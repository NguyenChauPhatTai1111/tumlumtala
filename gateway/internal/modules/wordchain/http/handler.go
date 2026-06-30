package http

import (
	"context"
	"net/http"
	"sort"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"github.com/tumlumtala/gateway/internal/interfaces/http/response"
	"github.com/tumlumtala/gateway/internal/shared/contextx"
)

type Handler struct {
	hub *Hub
}

func newHandler(hub *Hub) *Handler {
	return &Handler{hub: hub}
}

func identity(c *gin.Context) (string, string, bool) {
	claims, ok := contextx.Claims(c.Request.Context())
	if !ok || claims.UserID == "" {
		response.ErrorCode(c, http.StatusUnauthorized, "UNAUTHORIZED", "unauthorized")
		return "", "", false
	}
	name := c.GetString("user_name")
	if name == "" {
		name = displayName(claims.Email)
	}
	return claims.UserID, name, true
}

func (h *Handler) listRooms(c *gin.Context) {
	response.OK(c, http.StatusOK, h.hub.listRooms())
}

func (h *Handler) createRoom(c *gin.Context) {
	userID, name, ok := identity(c)
	if !ok {
		return
	}
	var req struct {
		Name       string `json:"name" binding:"required"`
		Password   string `json:"password"`
		MaxPlayers int    `json:"maxPlayers" binding:"required,min=2,max=6"`
		GameMode   string `json:"gameMode" binding:"required,oneof=traditional brawl"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorCode(c, http.StatusBadRequest, "INVALID_INPUT", "tên phòng không hợp lệ")
		return
	}
	result, err := h.hub.createRoom(
		userID, name, req.Name, req.Password, req.MaxPlayers, req.GameMode,
	)
	if err != nil {
		response.ErrorCode(c, http.StatusBadRequest, "INVALID_INPUT", err.Error())
		return
	}
	response.OK(c, http.StatusCreated, result)
}

func (h *Handler) joinRoom(c *gin.Context) {
	userID, name, ok := identity(c)
	if !ok {
		return
	}
	var req struct {
		Password string `json:"password"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorCode(c, http.StatusBadRequest, "INVALID_INPUT", "dữ liệu không hợp lệ")
		return
	}
	result, err := h.hub.joinRoom(userID, name, c.Param("room_id"), req.Password)
	if err != nil {
		response.ErrorCode(c, http.StatusBadRequest, "JOIN_FAILED", err.Error())
		return
	}
	response.OK(c, http.StatusOK, result)
}

func (h *Handler) roomState(c *gin.Context) {
	userID, _, ok := identity(c)
	if !ok {
		return
	}
	result, err := h.hub.roomState(userID, c.Param("room_id"))
	if err != nil {
		response.ErrorCode(c, http.StatusNotFound, "ROOM_NOT_FOUND", err.Error())
		return
	}
	response.OK(c, http.StatusOK, result)
}

func (h *Handler) leaveRoom(c *gin.Context) {
	userID, _, ok := identity(c)
	if !ok {
		return
	}
	h.hub.leaveUser(c.Param("room_id"), userID)
	response.OK(c, http.StatusOK, gin.H{"left": true})
}

func (h *Handler) createTicket(c *gin.Context) {
	userID, name, ok := identity(c)
	if !ok {
		return
	}
	value, err := h.hub.issueTicket(userID, name, c.Param("room_id"))
	if err != nil {
		response.ErrorCode(c, http.StatusForbidden, "TICKET_DENIED", err.Error())
		return
	}
	response.OK(c, http.StatusCreated, gin.H{"ticket": value, "expiresIn": 60})
}

func (h *Handler) leaderboard(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if limit < 1 {
		limit = 1
	}
	if limit > 100 {
		limit = 100
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
	defer cancel()
	pointRows, err := h.hub.redis.ZRevRangeWithScores(ctx, leaderboardPointsKey, 0, 999).Result()
	if err != nil && err != redis.Nil {
		response.ErrorCode(c, http.StatusServiceUnavailable, "LEADERBOARD_UNAVAILABLE", "không thể tải bảng xếp hạng")
		return
	}
	wordRows, err := h.hub.redis.ZRevRangeWithScores(ctx, leaderboardWordsKey, 0, 999).Result()
	if err != nil && err != redis.Nil {
		response.ErrorCode(c, http.StatusServiceUnavailable, "LEADERBOARD_UNAVAILABLE", "không thể tải bảng xếp hạng")
		return
	}
	type scoreRow struct {
		UserID string
		Words  int
		Points int
	}
	byUser := make(map[string]*scoreRow, len(pointRows)+len(wordRows))
	for _, row := range pointRows {
		userID, _ := row.Member.(string)
		byUser[userID] = &scoreRow{UserID: userID, Points: int(row.Score)}
	}
	for _, row := range wordRows {
		userID, _ := row.Member.(string)
		if byUser[userID] == nil {
			byUser[userID] = &scoreRow{UserID: userID}
		}
		byUser[userID].Words = int(row.Score)
	}
	scores := make([]*scoreRow, 0, len(byUser))
	for _, row := range byUser {
		scores = append(scores, row)
	}
	sort.Slice(scores, func(i, j int) bool {
		if scores[i].Points != scores[j].Points {
			return scores[i].Points > scores[j].Points
		}
		if scores[i].Words != scores[j].Words {
			return scores[i].Words > scores[j].Words
		}
		return scores[i].UserID < scores[j].UserID
	})
	if len(scores) > limit {
		scores = scores[:limit]
	}
	result := make([]gin.H, 0, len(scores))
	for index, row := range scores {
		name, _ := h.hub.redis.HGet(ctx, leaderboardNameKey, row.UserID).Result()
		result = append(result, gin.H{
			"rank": index + 1, "userId": row.UserID, "name": name,
			"words": row.Words, "points": row.Points, "score": row.Points,
		})
	}
	response.OK(c, http.StatusOK, result)
}

func (h *Handler) serveWS(c *gin.Context) {
	h.hub.serveWS(c.Writer, c.Request)
}
