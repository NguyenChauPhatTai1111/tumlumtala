package http

import (
	"log/slog"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/tumlumtala/musics-service/internal/common/httpctx"
	"github.com/tumlumtala/musics-service/internal/common/responses"
	intelligencedto "github.com/tumlumtala/musics-service/internal/module/application/dto/intelligence"
)

func (h *Handler) CreateAISession(c *gin.Context) {
	userUUID, ok := intelligenceUser(c)
	if !ok {
		return
	}
	var req intelligencedto.CreateSessionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		responses.ResponseError(c, responses.ErrBadRequest(err.Error()))
		return
	}
	result, err := h.intelligence.CreateSession(c.Request.Context(), userUUID, req)
	if err != nil {
		responses.ResponseError(c, err)
		return
	}
	responses.ResponseSuccess(c, http.StatusCreated, "AI DJ đã hiểu yêu cầu", responses.ResponseData{Data: result})
}

func (h *Handler) StartPersonalRadio(c *gin.Context) {
	userUUID, ok := intelligenceUser(c)
	if !ok {
		return
	}
	var body struct {
		Prompt string `json:"prompt"`
	}
	_ = c.ShouldBindJSON(&body)
	prompt := strings.TrimSpace(body.Prompt)
	if prompt == "" {
		prompt = "Phát radio cá nhân liên tục dựa trên Listening DNA hiện tại của tôi"
	}
	result, err := h.intelligence.CreateSession(c.Request.Context(), userUUID, intelligencedto.CreateSessionRequest{
		Prompt: prompt, Mode: "radio", DurationMinutes: 180,
	})
	if err != nil {
		responses.ResponseError(c, err)
		return
	}
	responses.ResponseSuccess(c, http.StatusCreated, "Personal Radio đã sẵn sàng lập queue", responses.ResponseData{Data: result})
}

func (h *Handler) CreateDynamicPlaylist(c *gin.Context) {
	userUUID, ok := intelligenceUser(c)
	if !ok {
		return
	}
	var body struct {
		Prompt          string `json:"prompt"`
		DurationMinutes int    `json:"duration_minutes"`
	}
	_ = c.ShouldBindJSON(&body)
	prompt := strings.TrimSpace(body.Prompt)
	if prompt == "" {
		prompt = "Tạo playlist động phù hợp thời điểm hiện tại trong ngày"
	}
	result, err := h.intelligence.CreateSession(c.Request.Context(), userUUID, intelligencedto.CreateSessionRequest{
		Prompt: prompt, Mode: "dynamic", DurationMinutes: body.DurationMinutes,
	})
	if err != nil {
		responses.ResponseError(c, err)
		return
	}
	responses.ResponseSuccess(c, http.StatusCreated, "Dynamic Playlist đã được lập kế hoạch", responses.ResponseData{Data: result})
}

func (h *Handler) GetAISession(c *gin.Context) {
	userUUID, ok := intelligenceUser(c)
	if !ok {
		return
	}
	result, err := h.intelligence.GetSession(c.Request.Context(), userUUID, c.Param("session_id"))
	if err != nil {
		responses.ResponseError(c, err)
		return
	}
	responses.ResponseSuccess(c, http.StatusOK, "lấy AI session thành công", responses.ResponseData{Data: result})
}

func (h *Handler) AddAICandidates(c *gin.Context) {
	userUUID, ok := intelligenceUser(c)
	if !ok {
		return
	}
	var req intelligencedto.AddCandidatesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		slog.Error("AddAICandidates: bind failed", "err", err)
		responses.ResponseError(c, responses.ErrBadRequest(err.Error()))
		return
	}
	result, err := h.intelligence.AddCandidates(c.Request.Context(), userUUID, c.Param("session_id"), req)
	if err != nil {
		responses.ResponseError(c, err)
		return
	}
	responses.ResponseSuccess(c, http.StatusOK, "AI DJ đã xếp timeline", responses.ResponseData{Data: result})
}

func (h *Handler) ChatWithMusic(c *gin.Context) {
	userUUID, ok := intelligenceUser(c)
	if !ok {
		return
	}
	var req intelligencedto.ChatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		responses.ResponseError(c, responses.ErrBadRequest(err.Error()))
		return
	}
	result, err := h.intelligence.Chat(c.Request.Context(), userUUID, c.Param("session_id"), req)
	if err != nil {
		responses.ResponseError(c, err)
		return
	}
	responses.ResponseSuccess(c, http.StatusOK, "AI DJ đã điều chỉnh hành trình", responses.ResponseData{Data: result})
}

func (h *Handler) BuildSmartQueue(c *gin.Context) {
	userUUID, ok := intelligenceUser(c)
	if !ok {
		return
	}
	var req intelligencedto.SmartQueueRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		responses.ResponseError(c, responses.ErrBadRequest(err.Error()))
		return
	}
	result, err := h.intelligence.SmartQueue(c.Request.Context(), userUUID, req)
	if err != nil {
		responses.ResponseError(c, err)
		return
	}
	responses.ResponseSuccess(c, http.StatusOK, "Smart Queue đã được cân bằng", responses.ResponseData{Data: result})
}

func (h *Handler) GetMusicJourney(c *gin.Context) {
	userUUID, ok := intelligenceUser(c)
	if !ok {
		return
	}
	days, _ := strconv.Atoi(c.DefaultQuery("days", "7"))
	result, err := h.intelligence.Journey(c.Request.Context(), userUUID, days)
	if err != nil {
		responses.ResponseError(c, err)
		return
	}
	responses.ResponseSuccess(c, http.StatusOK, "phân tích Music Journey thành công", responses.ResponseData{Data: result})
}

func (h *Handler) GetListeningHeatmap(c *gin.Context) {
	userUUID, ok := intelligenceUser(c)
	if !ok {
		return
	}
	days, _ := strconv.Atoi(c.DefaultQuery("days", "30"))
	result, err := h.intelligence.Heatmap(c.Request.Context(), userUUID, days)
	if err != nil {
		responses.ResponseError(c, err)
		return
	}
	responses.ResponseSuccess(c, http.StatusOK, "phân tích heatmap thành công", responses.ResponseData{Data: result})
}

func (h *Handler) DiscoverMusic(c *gin.Context) {
	userUUID, ok := intelligenceUser(c)
	if !ok {
		return
	}
	result, err := h.intelligence.Discover(c.Request.Context(), userUUID, c.Query("seed_source_id"))
	if err != nil {
		responses.ResponseError(c, err)
		return
	}
	responses.ResponseSuccess(c, http.StatusOK, "AI Discover đã tìm hướng khám phá", responses.ResponseData{Data: result})
}

func (h *Handler) ExplainMusic(c *gin.Context) {
	if _, ok := intelligenceUser(c); !ok {
		return
	}
	var req intelligencedto.TrackExplanationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		responses.ResponseError(c, responses.ErrBadRequest(err.Error()))
		return
	}
	responses.ResponseSuccess(c, http.StatusOK, "đã phân tích bài hát", responses.ResponseData{Data: h.intelligence.Explain(req)})
}

func (h *Handler) CompareMusic(c *gin.Context) {
	if _, ok := intelligenceUser(c); !ok {
		return
	}
	var req intelligencedto.CompareSongsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		responses.ResponseError(c, responses.ErrBadRequest(err.Error()))
		return
	}
	responses.ResponseSuccess(c, http.StatusOK, "đã so sánh hai bài hát", responses.ResponseData{Data: h.intelligence.Compare(req)})
}

func (h *Handler) ReviewAlbum(c *gin.Context) {
	if _, ok := intelligenceUser(c); !ok {
		return
	}
	var req intelligencedto.AlbumReviewRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		responses.ResponseError(c, responses.ErrBadRequest(err.Error()))
		return
	}
	responses.ResponseSuccess(c, http.StatusOK, "đã review album", responses.ResponseData{Data: h.intelligence.ReviewAlbum(req)})
}

func (h *Handler) DiscoverRemixes(c *gin.Context) {
	if _, ok := intelligenceUser(c); !ok {
		return
	}
	var req intelligencedto.RemixDiscoveryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		responses.ResponseError(c, responses.ErrBadRequest(err.Error()))
		return
	}
	responses.ResponseSuccess(c, http.StatusOK, "đã tạo truy vấn remix discovery", responses.ResponseData{Data: gin.H{"queries": h.intelligence.RemixQueries(req)}})
}

func (h *Handler) GetListeningChallenges(c *gin.Context) {
	userUUID, ok := intelligenceUser(c)
	if !ok {
		return
	}
	result, err := h.intelligence.Challenges(c.Request.Context(), userUUID)
	if err != nil {
		responses.ResponseError(c, err)
		return
	}
	responses.ResponseSuccess(c, http.StatusOK, "lấy listening challenges thành công", responses.ResponseData{Data: result})
}

func (h *Handler) CreateSyncRoom(c *gin.Context) {
	userUUID, ok := intelligenceUser(c)
	if !ok {
		return
	}
	result, err := h.intelligence.CreateSyncRoom(c.Request.Context(), userUUID)
	if err != nil {
		responses.ResponseError(c, err)
		return
	}
	responses.ResponseSuccess(c, http.StatusCreated, "đã tạo Friend Sync room", responses.ResponseData{Data: result})
}

func (h *Handler) JoinSyncRoom(c *gin.Context) {
	userUUID, ok := intelligenceUser(c)
	if !ok {
		return
	}
	var req intelligencedto.JoinSyncRoomRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		responses.ResponseError(c, responses.ErrBadRequest(err.Error()))
		return
	}
	result, err := h.intelligence.JoinSyncRoom(c.Request.Context(), userUUID, req.InviteCode)
	if err != nil {
		responses.ResponseError(c, err)
		return
	}
	responses.ResponseSuccess(c, http.StatusOK, "đã tham gia Friend Sync", responses.ResponseData{Data: result})
}

func (h *Handler) GetSyncRecommendations(c *gin.Context) {
	userUUID, ok := intelligenceUser(c)
	if !ok {
		return
	}
	var req intelligencedto.SyncRecommendationsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		responses.ResponseError(c, responses.ErrBadRequest(err.Error()))
		return
	}
	result, err := h.intelligence.SyncRecommendations(c.Request.Context(), userUUID, c.Param("room_id"), req.Candidates)
	if err != nil {
		responses.ResponseError(c, err)
		return
	}
	responses.ResponseSuccess(c, http.StatusOK, "đã tìm giao điểm gu nghe", responses.ResponseData{Data: result})
}

func intelligenceUser(c *gin.Context) (string, bool) {
	userUUID, err := httpctx.UserUUID(c)
	if err != nil {
		responses.ResponseError(c, responses.ErrUnauthorized("chưa đăng nhập"))
		return "", false
	}
	return userUUID, true
}
