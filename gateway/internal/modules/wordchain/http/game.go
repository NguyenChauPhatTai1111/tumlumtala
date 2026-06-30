package http

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"math/big"
	"net/http"
	"strings"
	"sync"
	"time"
	"unicode"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"
)

const (
	turnDuration         = 15 * time.Second
	reconnectGrace       = 30 * time.Second
	ticketLifetime       = time.Minute
	modeTraditional      = "traditional"
	modeBrawl            = "brawl"
	leaderboardWordsKey  = "wordchain:leaderboard"
	leaderboardPointsKey = "wordchain:leaderboard:points"
	leaderboardNameKey   = "wordchain:player-names"
)

var startingSyllables = []string{
	"âm", "bạn", "biển", "công", "đất", "điện", "đường", "gia",
	"học", "hoa", "lửa", "máy", "nghệ", "nhà", "nhân", "nước",
	"sách", "sinh", "tâm", "thiên", "thời", "tình", "trời", "văn", "xe",
}

type player struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	Connected  bool   `json:"connected"`
	Ready      bool   `json:"ready"`
	GameScore  int    `json:"gameScore"`
	GamePoints int    `json:"gamePoints"`
	Order      int    `json:"order"`
	Eliminated bool   `json:"eliminated"`
}

type chainEntry struct {
	Word        string `json:"word"`
	PlayerID    string `json:"playerId"`
	PlayerName  string `json:"playerName"`
	Explanation string `json:"explanation"`
	Points      int    `json:"points"`
}

type room struct {
	ID               string
	Name             string
	HostID           string
	PasswordHash     []byte
	MaxPlayers       int
	GameMode         string
	Players          map[string]*player
	PlayerOrder      []string
	Clients          map[string]*client
	Status           string
	TurnUserID       string
	RequiredSyllable string
	Deadline         time.Time
	Chain            []chainEntry
	UsedWords        map[string]struct{}
	LastSubmission   map[string]time.Time
	WinnerID         string
	EndReason        string
	TurnVersion      uint64
	Validating       bool
}

type roomView struct {
	ID               string       `json:"id"`
	Name             string       `json:"name"`
	HostID           string       `json:"hostId"`
	HasPassword      bool         `json:"hasPassword"`
	MaxPlayers       int          `json:"maxPlayers"`
	GameMode         string       `json:"gameMode"`
	Status           string       `json:"status"`
	Players          []*player    `json:"players"`
	TurnUserID       string       `json:"turnUserId,omitempty"`
	RequiredSyllable string       `json:"requiredSyllable,omitempty"`
	Deadline         *time.Time   `json:"deadline,omitempty"`
	RemainingMs      int64        `json:"remainingMs"`
	Chain            []chainEntry `json:"chain"`
	WinnerID         string       `json:"winnerId,omitempty"`
	EndReason        string       `json:"endReason,omitempty"`
	Validating       bool         `json:"validating"`
}

type roomSummary struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	HostName    string `json:"hostName"`
	HasPassword bool   `json:"hasPassword"`
	PlayerCount int    `json:"playerCount"`
	MaxPlayers  int    `json:"maxPlayers"`
	GameMode    string `json:"gameMode"`
	Status      string `json:"status"`
}

type ticket struct {
	UserID    string
	UserName  string
	RoomID    string
	ExpiresAt time.Time
}

type client struct {
	conn   *websocket.Conn
	send   chan []byte
	userID string
	roomID string
	hub    *Hub
}

type llmValidator interface {
	validateAndExplain(context.Context, string) (validationResult, error)
}

type validationResult struct {
	Valid       bool   `json:"valid"`
	Normalized  string `json:"normalized"`
	Explanation string `json:"explanation"`
}

type Hub struct {
	mu        sync.RWMutex
	rooms     map[string]*room
	tickets   map[string]ticket
	validator llmValidator
	redis     *redis.Client
	upgrader  websocket.Upgrader
}

func newHub(validator llmValidator, redisClient *redis.Client) *Hub {
	return &Hub{
		rooms:     make(map[string]*room),
		tickets:   make(map[string]ticket),
		validator: validator,
		redis:     redisClient,
		upgrader: websocket.Upgrader{
			CheckOrigin: func(_ *http.Request) bool { return true },
		},
	}
}

func (h *Hub) createRoom(
	userID, userName, name, password string,
	maxPlayers int,
	gameMode string,
) (roomView, error) {
	name = strings.TrimSpace(name)
	if len([]rune(name)) < 2 || len([]rune(name)) > 40 {
		return roomView{}, errors.New("tên phòng phải có từ 2 đến 40 ký tự")
	}
	if maxPlayers < 2 || maxPlayers > 6 {
		return roomView{}, errors.New("số người tối đa phải từ 2 đến 6")
	}
	if maxPlayers == 2 {
		gameMode = modeTraditional
	}
	if gameMode != modeTraditional && gameMode != modeBrawl {
		return roomView{}, errors.New("chế độ chơi không hợp lệ")
	}
	var passwordHash []byte
	var err error
	if password != "" {
		if len([]rune(password)) < 4 || len([]rune(password)) > 40 {
			return roomView{}, errors.New("mật khẩu phải có từ 4 đến 40 ký tự")
		}
		passwordHash, err = bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
		if err != nil {
			return roomView{}, errors.New("không thể bảo vệ phòng")
		}
	}

	h.mu.Lock()
	defer h.mu.Unlock()
	h.removeUserFromRoomsLocked(userID)
	id := randomRoomID()
	r := &room{
		ID:           id,
		Name:         name,
		HostID:       userID,
		PasswordHash: passwordHash,
		MaxPlayers:   maxPlayers,
		GameMode:     gameMode,
		Players: map[string]*player{
			userID: {ID: userID, Name: userName, Order: 1},
		},
		PlayerOrder:    []string{userID},
		Clients:        make(map[string]*client),
		Status:         "waiting",
		Chain:          make([]chainEntry, 0),
		UsedWords:      make(map[string]struct{}),
		LastSubmission: make(map[string]time.Time),
	}
	h.rooms[id] = r
	return viewOf(r), nil
}

func (h *Hub) listRooms() []roomSummary {
	h.mu.RLock()
	defer h.mu.RUnlock()
	result := make([]roomSummary, 0, len(h.rooms))
	for _, r := range h.rooms {
		if r.Status == "playing" || len(r.Players) >= r.MaxPlayers {
			continue
		}
		hostName := "Chủ phòng"
		if host := r.Players[r.HostID]; host != nil {
			hostName = host.Name
		}
		result = append(result, roomSummary{
			ID:          r.ID,
			Name:        r.Name,
			HostName:    hostName,
			HasPassword: len(r.PasswordHash) > 0,
			PlayerCount: len(r.Players),
			MaxPlayers:  r.MaxPlayers,
			GameMode:    r.GameMode,
			Status:      r.Status,
		})
	}
	return result
}

func (h *Hub) joinRoom(userID, userName, roomID, password string) (roomView, error) {
	h.mu.Lock()
	defer h.mu.Unlock()
	r := h.rooms[roomID]
	if r == nil {
		return roomView{}, errors.New("phòng không tồn tại")
	}
	if existing := r.Players[userID]; existing != nil {
		existing.Name = userName
		return viewOf(r), nil
	}
	if r.Status == "playing" || r.Status == "countdown" {
		return roomView{}, errors.New("ván chơi đã bắt đầu")
	}
	if len(r.Players) >= r.MaxPlayers {
		return roomView{}, fmt.Errorf("phòng đã đủ %d người", r.MaxPlayers)
	}
	if len(r.PasswordHash) > 0 &&
		bcrypt.CompareHashAndPassword(r.PasswordHash, []byte(password)) != nil {
		return roomView{}, errors.New("mật khẩu phòng không đúng")
	}
	h.removeUserFromRoomsLocked(userID)
	r.PlayerOrder = append(r.PlayerOrder, userID)
	r.Players[userID] = &player{ID: userID, Name: userName, Order: len(r.PlayerOrder)}
	h.broadcastLocked(r, "room_state", viewOf(r))
	return viewOf(r), nil
}

func (h *Hub) roomState(userID, roomID string) (roomView, error) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	r := h.rooms[roomID]
	if r == nil || r.Players[userID] == nil {
		return roomView{}, errors.New("bạn không ở trong phòng này")
	}
	return viewOf(r), nil
}

func (h *Hub) issueTicket(userID, userName, roomID string) (string, error) {
	h.mu.Lock()
	defer h.mu.Unlock()
	for value, existing := range h.tickets {
		if time.Now().After(existing.ExpiresAt) {
			delete(h.tickets, value)
		}
	}
	r := h.rooms[roomID]
	if r == nil || r.Players[userID] == nil {
		return "", errors.New("bạn không ở trong phòng này")
	}
	value := uuid.NewString()
	h.tickets[value] = ticket{
		UserID: userID, UserName: userName, RoomID: roomID, ExpiresAt: time.Now().Add(ticketLifetime),
	}
	return value, nil
}

func (h *Hub) serveWS(w http.ResponseWriter, r *http.Request) {
	ticketValue := r.URL.Query().Get("ticket")
	h.mu.Lock()
	t, ok := h.tickets[ticketValue]
	delete(h.tickets, ticketValue)
	if !ok || time.Now().After(t.ExpiresAt) || h.rooms[t.RoomID] == nil {
		h.mu.Unlock()
		http.Error(w, "invalid websocket ticket", http.StatusUnauthorized)
		return
	}
	h.mu.Unlock()

	conn, err := h.upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	c := &client{
		conn: conn, send: make(chan []byte, 32), userID: t.UserID, roomID: t.RoomID, hub: h,
	}
	h.attach(c, t.UserName)
	go c.writePump()
	c.readPump()
}

func (h *Hub) attach(c *client, userName string) {
	h.mu.Lock()
	defer h.mu.Unlock()
	r := h.rooms[c.roomID]
	if r == nil || r.Players[c.userID] == nil {
		_ = c.conn.Close()
		return
	}
	if previous := r.Clients[c.userID]; previous != nil {
		closeClient(previous)
	}
	r.Clients[c.userID] = c
	if p := r.Players[c.userID]; p != nil {
		p.Connected = true
		p.Name = userName
	}
	h.broadcastLocked(r, "room_state", viewOf(r))
}

func (c *client) readPump() {
	defer c.hub.disconnect(c)
	c.conn.SetReadLimit(4096)
	_ = c.conn.SetReadDeadline(time.Now().Add(45 * time.Second))
	c.conn.SetPongHandler(func(string) error {
		return c.conn.SetReadDeadline(time.Now().Add(45 * time.Second))
	})
	for {
		var message struct {
			Type    string `json:"type"`
			Word    string `json:"word"`
			UserID  string `json:"userId"`
			Content string `json:"content"`
		}
		if err := c.conn.ReadJSON(&message); err != nil {
			return
		}
		switch message.Type {
		case "ready":
			c.hub.toggleReady(c.roomID, c.userID)
		case "change_mode":
			c.hub.changeMode(c.roomID, c.userID, message.Word) // reuse Word field for mode value
		case "start":
			c.hub.startGame(c.roomID, c.userID)
		case "submit":
			c.hub.submitWord(c.roomID, c.userID, message.Word)
		case "kick":
			c.hub.kick(c.roomID, c.userID, message.UserID)
		case "leave":
			c.hub.leave(c)
			return
		case "chat":
			c.hub.broadcastChat(c.roomID, c.userID, strings.TrimSpace(message.Content))
		}
	}
}

func (c *client) writePump() {
	ticker := time.NewTicker(20 * time.Second)
	defer ticker.Stop()
	for {
		select {
		case payload, ok := <-c.send:
			if !ok {
				_ = c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			_ = c.conn.SetWriteDeadline(time.Now().Add(5 * time.Second))
			if err := c.conn.WriteMessage(websocket.TextMessage, payload); err != nil {
				return
			}
		case <-ticker.C:
			_ = c.conn.SetWriteDeadline(time.Now().Add(5 * time.Second))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func (h *Hub) changeMode(roomID, userID, mode string) {
	h.mu.Lock()
	defer h.mu.Unlock()
	r := h.rooms[roomID]
	if r == nil || r.Status != "waiting" || r.HostID != userID {
		return
	}
	if mode != modeTraditional && mode != modeBrawl {
		return
	}
	if r.MaxPlayers == 2 && mode == modeBrawl {
		return
	}
	r.GameMode = mode
	h.broadcastLocked(r, "room_state", viewOf(r))
}

func (h *Hub) broadcastChat(roomID, userID, content string) {
	if content == "" || len([]rune(content)) > 500 {
		return
	}
	h.mu.Lock()
	defer h.mu.Unlock()
	r := h.rooms[roomID]
	if r == nil {
		return
	}
	p := r.Players[userID]
	name := ""
	if p != nil {
		name = p.Name
	}
	payload := map[string]string{
		"senderId":   userID,
		"senderName": name,
		"content":    content,
	}
	h.broadcastLocked(r, "chat", payload)
}

func (h *Hub) toggleReady(roomID, userID string) {
	h.mu.Lock()
	defer h.mu.Unlock()
	r := h.rooms[roomID]
	if r == nil || r.Status != "waiting" {
		return
	}
	p := r.Players[userID]
	if p == nil {
		return
	}
	p.Ready = !p.Ready
	h.broadcastLocked(r, "room_state", viewOf(r))
}

func (h *Hub) startGame(roomID, userID string) {
	h.mu.Lock()
	r := h.rooms[roomID]
	if r == nil {
		h.mu.Unlock()
		return
	}
	if r.Status != "waiting" && r.Status != "finished" {
		h.mu.Unlock()
		return
	}
	if r.HostID != userID {
		h.sendErrorLocked(r, userID, "Chỉ chủ phòng được bắt đầu.")
		h.mu.Unlock()
		return
	}
	if len(r.Players) < 2 || len(r.Players) > r.MaxPlayers || connectedCount(r) != len(r.Players) {
		h.sendErrorLocked(r, userID, fmt.Sprintf(
			"Cần từ 2 đến %d người đang kết nối để bắt đầu.", r.MaxPlayers,
		))
		h.mu.Unlock()
		return
	}
	// Only check ready when starting fresh from waiting (not a rematch from finished)
	if r.Status == "waiting" {
		for _, p := range r.Players {
			if p.ID != r.HostID && !p.Ready {
				h.sendErrorLocked(r, userID, "Tất cả người chơi phải sẵn sàng trước khi bắt đầu.")
				h.mu.Unlock()
				return
			}
		}
	}
	r.Status = "countdown"
	h.broadcastLocked(r, "countdown", map[string]any{"seconds": 3})
	h.mu.Unlock()

	// Countdown 3s then actually start
	go func() {
		time.Sleep(3 * time.Second)
		h.mu.Lock()
		r := h.rooms[roomID]
		if r == nil || r.Status != "countdown" {
			h.mu.Unlock()
			return
		}
		// Shuffle player order (including host)
		shuffleStrings(r.PlayerOrder)
		for i, id := range r.PlayerOrder {
			if p := r.Players[id]; p != nil {
				p.Order = i + 1
			}
		}
		r.HostID = r.PlayerOrder[0]

		r.Status = "playing"
		if r.GameMode == modeTraditional {
			r.TurnUserID = r.PlayerOrder[0]
		} else {
			r.TurnUserID = ""
		}
		r.RequiredSyllable = randomStartingSyllable()
		r.Deadline = time.Now().Add(turnDuration)
		r.Chain = make([]chainEntry, 0)
		r.UsedWords = make(map[string]struct{})
		r.LastSubmission = make(map[string]time.Time)
		r.WinnerID = ""
		r.EndReason = ""
		r.Validating = false
		r.TurnVersion++
		for _, p := range r.Players {
			p.GameScore = 0
			p.GamePoints = 0
			p.Eliminated = false
			p.Ready = false
		}
		version := r.TurnVersion
		h.broadcastLocked(r, "game_started", viewOf(r))
		h.mu.Unlock()
		h.scheduleTimeout(roomID, version)
	}()
}

func (h *Hub) submitWord(roomID, userID, rawWord string) {
	word := normalizePhrase(rawWord)
	parts := strings.Fields(word)

	h.mu.Lock()
	r := h.rooms[roomID]
	if r == nil || r.Status != "playing" {
		h.mu.Unlock()
		return
	}
	if r.GameMode == modeTraditional {
		if r.TurnUserID != userID {
			h.sendErrorLocked(r, userID, "Chưa đến lượt của bạn.")
			h.mu.Unlock()
			return
		}
	} else {
		if p := r.Players[userID]; p == nil || p.Eliminated {
			h.sendErrorLocked(r, userID, "Bạn không thể trả lời ở lượt này.")
			h.mu.Unlock()
			return
		}
	}
	if r.Validating {
		h.sendErrorLocked(r, userID, "Từ trước đang được kiểm tra.")
		h.mu.Unlock()
		return
	}
	if len(parts) == 1 && r.RequiredSyllable != "" {
		word = r.RequiredSyllable + " " + parts[0]
		parts = strings.Fields(word)
	} else if len(parts) != 2 {
		h.sendErrorLocked(r, userID, "Hãy nhập âm thứ hai hoặc nhập đầy đủ cụm từ gồm 2 âm tiết.")
		h.mu.Unlock()
		return
	}
	if len([]rune(word)) > 60 {
		h.sendErrorLocked(r, userID, "Cụm từ quá dài.")
		h.mu.Unlock()
		return
	}
	if time.Since(r.LastSubmission[userID]) < 750*time.Millisecond {
		h.sendErrorLocked(r, userID, "Bạn đang gửi quá nhanh.")
		h.mu.Unlock()
		return
	}
	if r.RequiredSyllable != "" && parts[0] != r.RequiredSyllable {
		h.sendErrorLocked(r, userID, fmt.Sprintf("Từ mới phải bắt đầu bằng “%s”.", r.RequiredSyllable))
		h.mu.Unlock()
		return
	}
	if _, used := r.UsedWords[word]; used {
		h.sendErrorLocked(r, userID, "Cụm từ này đã được sử dụng.")
		h.mu.Unlock()
		return
	}
	r.Validating = true
	r.LastSubmission[userID] = time.Now()
	earnedPoints := calculateWordPoints(r.Deadline, r.LastSubmission[userID])
	version := r.TurnVersion
	h.broadcastLocked(r, "word_checking", map[string]any{"word": word, "userId": userID})
	h.mu.Unlock()

	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		result, err := h.validator.validateAndExplain(ctx, word)
		h.completeValidation(roomID, userID, word, version, earnedPoints, result, err)
	}()
}

func (h *Hub) completeValidation(
	roomID, userID, word string,
	version uint64,
	earnedPoints int,
	result validationResult,
	validationErr error,
) {
	h.mu.Lock()
	r := h.rooms[roomID]
	if r == nil || r.Status != "playing" || r.TurnVersion != version ||
		(r.GameMode == modeTraditional && r.TurnUserID != userID) {
		h.mu.Unlock()
		return
	}
	r.Validating = false
	if validationErr != nil {
		log.Printf("word-chain: Groq validation failed: %v", validationErr)
		if time.Now().After(r.Deadline) && r.GameMode == modeTraditional {
			h.eliminatePlayerLocked(r, userID, "timeout")
			h.mu.Unlock()
			return
		}
		if time.Now().After(r.Deadline) {
			h.finishBrawlLocked(r, "no_answer")
			h.mu.Unlock()
			return
		}
		h.sendErrorLocked(r, userID, "Không thể kiểm tra nghĩa lúc này, hãy thử lại.")
		h.broadcastLocked(r, "room_state", viewOf(r))
		h.mu.Unlock()
		return
	}
	if !result.Valid {
		if time.Now().After(r.Deadline) && r.GameMode == modeTraditional {
			h.eliminatePlayerLocked(r, userID, "timeout")
			h.mu.Unlock()
			return
		}
		message := strings.TrimSpace(result.Explanation)
		if message == "" {
			message = "Groq không xác nhận đây là một cụm từ tiếng Việt có nghĩa."
		}
		h.broadcastLocked(r, "word_rejected", map[string]any{
			"word": word, "userId": userID, "explanation": message,
		})
		if time.Now().After(r.Deadline) {
			h.finishBrawlLocked(r, "no_answer")
			h.mu.Unlock()
			return
		}
		h.broadcastLocked(r, "room_state", viewOf(r))
		h.mu.Unlock()
		return
	}

	if normalized := normalizePhrase(result.Normalized); len(strings.Fields(normalized)) == 2 {
		normalizedParts := strings.Fields(normalized)
		if r.RequiredSyllable == "" || normalizedParts[0] == r.RequiredSyllable {
			word = normalized
		}
	}
	if _, used := r.UsedWords[word]; used {
		h.broadcastLocked(r, "word_rejected", map[string]any{
			"word":        word,
			"userId":      userID,
			"explanation": "Cụm từ này đã được sử dụng trong ván hiện tại.",
		})
		h.broadcastLocked(r, "room_state", viewOf(r))
		h.mu.Unlock()
		return
	}
	p := r.Players[userID]
	if p == nil {
		h.mu.Unlock()
		return
	}
	p.GameScore++
	p.GamePoints += earnedPoints
	playerName := p.Name
	r.UsedWords[word] = struct{}{}
	r.Chain = append(r.Chain, chainEntry{
		Word: word, PlayerID: userID, PlayerName: p.Name,
		Explanation: result.Explanation, Points: earnedPoints,
	})
	r.RequiredSyllable = lastSyllable(word)
	if r.GameMode == modeTraditional {
		r.TurnUserID = nextActivePlayerID(r, userID)
	} else {
		r.TurnUserID = ""
	}
	r.Deadline = time.Now().Add(turnDuration)
	r.TurnVersion++
	r.LastSubmission = make(map[string]time.Time)
	nextVersion := r.TurnVersion
	h.broadcastLocked(r, "word_accepted", r.Chain[len(r.Chain)-1])
	h.broadcastLocked(r, "room_state", viewOf(r))
	h.mu.Unlock()

	if h.redis != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		pipe := h.redis.Pipeline()
		pipe.ZIncrBy(ctx, leaderboardWordsKey, 1, userID)
		pipe.ZIncrBy(ctx, leaderboardPointsKey, float64(earnedPoints), userID)
		pipe.HSet(ctx, leaderboardNameKey, userID, playerName)
		_, _ = pipe.Exec(ctx)
	}
	h.scheduleTimeout(roomID, nextVersion)
}

func calculateWordPoints(deadline, submittedAt time.Time) int {
	totalMilliseconds := turnDuration.Milliseconds()
	remainingMilliseconds := max(deadline.Sub(submittedAt).Milliseconds(), 0)
	remainingMilliseconds = min(remainingMilliseconds, totalMilliseconds)
	return 10 + int((remainingMilliseconds*90+totalMilliseconds-1)/totalMilliseconds)
}

func (h *Hub) scheduleTimeout(roomID string, version uint64) {
	time.AfterFunc(turnDuration+50*time.Millisecond, func() {
		h.mu.Lock()
		defer h.mu.Unlock()
		r := h.rooms[roomID]
		if r == nil || r.Status != "playing" || r.TurnVersion != version ||
			time.Now().Before(r.Deadline) {
			return
		}
		// A word submitted before the deadline must be fully judged. If it is
		// rejected, completeValidation ends the turn once Groq responds.
		if r.Validating {
			return
		}
		if r.GameMode == modeBrawl {
			h.finishBrawlLocked(r, "no_answer")
		} else {
			h.eliminatePlayerLocked(r, r.TurnUserID, "timeout")
		}
	})
}

func (h *Hub) finishBrawlLocked(r *room, reason string) {
	winnerID := ""
	bestPoints := -1
	bestWords := -1
	for _, id := range r.PlayerOrder {
		p := r.Players[id]
		if p == nil {
			continue
		}
		if p.GamePoints > bestPoints ||
			(p.GamePoints == bestPoints && p.GameScore > bestWords) {
			winnerID = id
			bestPoints = p.GamePoints
			bestWords = p.GameScore
		}
	}
	h.finishGameLocked(r, winnerID, reason)
}

func (h *Hub) kick(roomID, actorID, targetID string) {
	h.mu.Lock()
	defer h.mu.Unlock()
	r := h.rooms[roomID]
	if r == nil || r.HostID != actorID || targetID == actorID || r.Players[targetID] == nil {
		return
	}
	if r.Status == "playing" {
		h.eliminatePlayerLocked(r, targetID, "kicked")
	}
	if c := r.Clients[targetID]; c != nil {
		h.sendLocked(c, "kicked", map[string]string{"message": "Bạn đã bị chủ phòng mời ra."})
		closeClient(c)
		delete(r.Clients, targetID)
	}
	delete(r.Players, targetID)
	removePlayerFromOrder(r, targetID)
	h.broadcastLocked(r, "room_state", viewOf(r))
}

func (h *Hub) disconnect(c *client) {
	h.mu.Lock()
	r := h.rooms[c.roomID]
	if r == nil || r.Clients[c.userID] != c {
		h.mu.Unlock()
		_ = c.conn.Close()
		return
	}
	delete(r.Clients, c.userID)
	if p := r.Players[c.userID]; p != nil {
		p.Connected = false
	}
	h.broadcastLocked(r, "room_state", viewOf(r))
	h.mu.Unlock()
	_ = c.conn.Close()

	time.AfterFunc(reconnectGrace, func() {
		h.mu.Lock()
		defer h.mu.Unlock()
		current := h.rooms[c.roomID]
		if current == nil || current.Clients[c.userID] != nil {
			return
		}
		if current.Status == "playing" {
			h.eliminatePlayerLocked(current, c.userID, "disconnected")
		}
		if current.HostID == c.userID {
			h.broadcastLocked(current, "room_closed", map[string]string{"message": "Chủ phòng đã rời phòng."})
			for _, connected := range current.Clients {
				closeClient(connected)
			}
			delete(h.rooms, current.ID)
			return
		}
		delete(current.Players, c.userID)
		removePlayerFromOrder(current, c.userID)
		h.broadcastLocked(current, "room_state", viewOf(current))
	})
}

func (h *Hub) leave(c *client) {
	h.leaveUser(c.roomID, c.userID)
}

func (h *Hub) leaveUser(roomID, userID string) {
	h.mu.Lock()
	defer h.mu.Unlock()
	r := h.rooms[roomID]
	if r == nil || r.Players[userID] == nil {
		return
	}
	if connected := r.Clients[userID]; connected != nil {
		delete(r.Clients, userID)
		closeClient(connected)
	}
	if r.HostID == userID {
		h.broadcastLocked(r, "room_closed", map[string]string{"message": "Chủ phòng đã đóng phòng."})
		for _, connected := range r.Clients {
			closeClient(connected)
		}
		delete(h.rooms, r.ID)
		return
	}
	if r.Status == "playing" {
		h.eliminatePlayerLocked(r, userID, "left")
	}
	delete(r.Players, userID)
	removePlayerFromOrder(r, userID)
	h.broadcastLocked(r, "room_state", viewOf(r))
}

func (h *Hub) eliminatePlayerLocked(r *room, userID, reason string) {
	p := r.Players[userID]
	if p == nil || p.Eliminated || r.Status != "playing" {
		return
	}
	wasCurrentTurn := r.TurnUserID == userID
	p.Eliminated = true
	h.broadcastLocked(r, "player_eliminated", map[string]any{
		"userId": userID, "name": p.Name, "reason": reason,
	})

	if activePlayerCount(r) <= 1 {
		h.finishGameLocked(r, soleActivePlayerID(r), reason)
		return
	}
	if wasCurrentTurn {
		r.Validating = false
		r.TurnUserID = nextActivePlayerID(r, userID)
		r.Deadline = time.Now().Add(turnDuration)
		r.TurnVersion++
		version := r.TurnVersion
		h.broadcastLocked(r, "room_state", viewOf(r))
		h.scheduleTimeout(r.ID, version)
		return
	}
	h.broadcastLocked(r, "room_state", viewOf(r))
}

func (h *Hub) finishGameLocked(r *room, winnerID, reason string) {
	r.Status = "finished"
	r.WinnerID = winnerID
	r.EndReason = reason
	r.Deadline = time.Time{}
	r.Validating = false
	r.TurnVersion++
	h.broadcastLocked(r, "game_over", viewOf(r))
}

func (h *Hub) removeUserFromRoomsLocked(userID string) {
	for roomID, r := range h.rooms {
		if r.Players[userID] == nil {
			continue
		}
		if r.HostID == userID {
			h.broadcastLocked(r, "room_closed", map[string]string{"message": "Chủ phòng đã đóng phòng."})
			for _, connected := range r.Clients {
				closeClient(connected)
			}
			delete(h.rooms, roomID)
			continue
		}
		if r.Status == "playing" {
			h.eliminatePlayerLocked(r, userID, "left")
		}
		delete(r.Players, userID)
		removePlayerFromOrder(r, userID)
		if connected := r.Clients[userID]; connected != nil {
			closeClient(connected)
			delete(r.Clients, userID)
		}
		h.broadcastLocked(r, "room_state", viewOf(r))
	}
}

func (h *Hub) broadcastLocked(r *room, eventType string, data any) {
	payload, _ := json.Marshal(map[string]any{"type": eventType, "data": data})
	for _, c := range r.Clients {
		select {
		case c.send <- payload:
		default:
		}
	}
}

func (h *Hub) sendErrorLocked(r *room, userID, message string) {
	if c := r.Clients[userID]; c != nil {
		h.sendLocked(c, "error", map[string]string{"message": message})
	}
}

func (h *Hub) sendLocked(c *client, eventType string, data any) {
	payload, _ := json.Marshal(map[string]any{"type": eventType, "data": data})
	select {
	case c.send <- payload:
	default:
	}
}

func closeClient(c *client) {
	defer func() { _ = recover() }()
	close(c.send)
	_ = c.conn.Close()
}

func viewOf(r *room) roomView {
	players := make([]*player, 0, len(r.Players))
	for _, id := range r.PlayerOrder {
		p := r.Players[id]
		if p == nil {
			continue
		}
		copyOfPlayer := *p
		players = append(players, &copyOfPlayer)
	}
	var deadline *time.Time
	var remainingMs int64
	if !r.Deadline.IsZero() {
		value := r.Deadline
		deadline = &value
		remainingMs = max(time.Until(r.Deadline).Milliseconds(), 0)
	}
	chain := append(make([]chainEntry, 0, len(r.Chain)), r.Chain...)
	return roomView{
		ID: r.ID, Name: r.Name, HostID: r.HostID, HasPassword: len(r.PasswordHash) > 0,
		MaxPlayers: r.MaxPlayers, GameMode: r.GameMode,
		Status: r.Status, Players: players, TurnUserID: r.TurnUserID,
		RequiredSyllable: r.RequiredSyllable, Deadline: deadline, RemainingMs: remainingMs, Chain: chain,
		WinnerID: r.WinnerID, EndReason: r.EndReason, Validating: r.Validating,
	}
}

func connectedCount(r *room) int {
	count := 0
	for _, p := range r.Players {
		if p.Connected {
			count++
		}
	}
	return count
}

func nextActivePlayerID(r *room, userID string) string {
	if len(r.PlayerOrder) == 0 {
		return ""
	}
	start := 0
	for index, id := range r.PlayerOrder {
		if id == userID {
			start = index
			break
		}
	}
	for offset := 1; offset <= len(r.PlayerOrder); offset++ {
		id := r.PlayerOrder[(start+offset)%len(r.PlayerOrder)]
		if p := r.Players[id]; p != nil && !p.Eliminated {
			return id
		}
	}
	return ""
}

func activePlayerCount(r *room) int {
	count := 0
	for _, p := range r.Players {
		if !p.Eliminated {
			count++
		}
	}
	return count
}

func soleActivePlayerID(r *room) string {
	for _, id := range r.PlayerOrder {
		if p := r.Players[id]; p != nil && !p.Eliminated {
			return id
		}
	}
	return ""
}

func removePlayerFromOrder(r *room, userID string) {
	next := r.PlayerOrder[:0]
	for _, id := range r.PlayerOrder {
		if id != userID {
			next = append(next, id)
		}
	}
	r.PlayerOrder = next
	for index, id := range r.PlayerOrder {
		if p := r.Players[id]; p != nil {
			p.Order = index + 1
		}
	}
}

func normalizePhrase(value string) string {
	return strings.ToLower(strings.Join(strings.Fields(strings.TrimSpace(value)), " "))
}

func lastSyllable(value string) string {
	parts := strings.Fields(value)
	if len(parts) == 0 {
		return ""
	}
	return parts[len(parts)-1]
}

func randomRoomID() string {
	var raw [4]byte
	if _, err := rand.Read(raw[:]); err != nil {
		return strings.ToUpper(uuid.NewString()[:8])
	}
	return strings.ToUpper(hex.EncodeToString(raw[:]))
}

func randomStartingSyllable() string {
	index, err := rand.Int(rand.Reader, big.NewInt(int64(len(startingSyllables))))
	if err != nil {
		return startingSyllables[time.Now().UnixNano()%int64(len(startingSyllables))]
	}
	return startingSyllables[index.Int64()]
}

func shuffleStrings(s []string) {
	for i := len(s) - 1; i > 0; i-- {
		j, err := rand.Int(rand.Reader, big.NewInt(int64(i+1)))
		if err != nil {
			continue
		}
		s[i], s[j.Int64()] = s[j.Int64()], s[i]
	}
}

func displayName(email string) string {
	name := strings.TrimSpace(strings.Split(email, "@")[0])
	if name == "" {
		return "Người chơi"
	}
	parts := strings.FieldsFunc(name, func(r rune) bool {
		return r == '.' || r == '_' || r == '-'
	})
	for i, part := range parts {
		runes := []rune(part)
		if len(runes) > 0 {
			runes[0] = unicode.ToUpper(runes[0])
			parts[i] = string(runes)
		}
	}
	return strings.Join(parts, " ")
}
