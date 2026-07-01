package http

import (
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/tumlumtala/musics-service/internal/common/httpctx"
	"github.com/tumlumtala/musics-service/internal/common/responses"
	"github.com/tumlumtala/musics-service/internal/infrastructure/spotify"
	eventdto "github.com/tumlumtala/musics-service/internal/module/application/dto/event"
	librarydto "github.com/tumlumtala/musics-service/internal/module/application/dto/library"
	mediadto "github.com/tumlumtala/musics-service/internal/module/application/dto/media"
	playlistdto "github.com/tumlumtala/musics-service/internal/module/application/dto/playlist"
	searchdto "github.com/tumlumtala/musics-service/internal/module/application/dto/search"
	historyquery "github.com/tumlumtala/musics-service/internal/module/application/query/history"
	libraryquery "github.com/tumlumtala/musics-service/internal/module/application/query/library"
	likedquery "github.com/tumlumtala/musics-service/internal/module/application/query/liked"
	listeningquery "github.com/tumlumtala/musics-service/internal/module/application/query/listening"
	playlistquery "github.com/tumlumtala/musics-service/internal/module/application/query/playlist"
	searchquery "github.com/tumlumtala/musics-service/internal/module/application/query/search"
	historyuc "github.com/tumlumtala/musics-service/internal/module/application/usecase/history"
	intelligenceuc "github.com/tumlumtala/musics-service/internal/module/application/usecase/intelligence"
	libraryuc "github.com/tumlumtala/musics-service/internal/module/application/usecase/library"
	likeduc "github.com/tumlumtala/musics-service/internal/module/application/usecase/liked"
	listeninguc "github.com/tumlumtala/musics-service/internal/module/application/usecase/listening"
	playlistuc "github.com/tumlumtala/musics-service/internal/module/application/usecase/playlist"
	searchuc "github.com/tumlumtala/musics-service/internal/module/application/usecase/search"
)

type Handler struct {
	likedQuery       *likedquery.QueryService
	likedUseCase     *likeduc.UseCase
	historyQuery     *historyquery.QueryService
	historyUseCase   *historyuc.UseCase
	searchQuery      *searchquery.QueryService
	searchUseCase    *searchuc.UseCase
	playlistQuery    *playlistquery.QueryService
	playlistUseCase  *playlistuc.UseCase
	libraryQuery     *libraryquery.QueryService
	libraryUseCase   *libraryuc.UseCase
	listeningQuery   *listeningquery.QueryService
	listeningUseCase *listeninguc.UseCase
	intelligence     *intelligenceuc.Service
	spotify          *spotify.Client
}

func NewHandler(
	likedQuery *likedquery.QueryService,
	likedUseCase *likeduc.UseCase,
	historyQuery *historyquery.QueryService,
	historyUseCase *historyuc.UseCase,
	searchQuery *searchquery.QueryService,
	searchUseCase *searchuc.UseCase,
	playlistQuery *playlistquery.QueryService,
	playlistUseCase *playlistuc.UseCase,
	libraryQuery *libraryquery.QueryService,
	libraryUseCase *libraryuc.UseCase,
	listeningQuery *listeningquery.QueryService,
	listeningUseCase *listeninguc.UseCase,
	intelligence *intelligenceuc.Service,
	spotifyClient *spotify.Client,
) *Handler {
	return &Handler{
		likedQuery:       likedQuery,
		likedUseCase:     likedUseCase,
		historyQuery:     historyQuery,
		historyUseCase:   historyUseCase,
		searchQuery:      searchQuery,
		searchUseCase:    searchUseCase,
		playlistQuery:    playlistQuery,
		playlistUseCase:  playlistUseCase,
		libraryQuery:     libraryQuery,
		libraryUseCase:   libraryUseCase,
		listeningQuery:   listeningQuery,
		listeningUseCase: listeningUseCase,
		intelligence:     intelligence,
		spotify:          spotifyClient,
	}
}

func (h *Handler) SearchSpotifyTracks(c *gin.Context) {
	query := strings.TrimSpace(c.Query("q"))
	if query == "" {
		responses.ResponseError(c, responses.ErrBadRequest("q không được để trống"))
		return
	}
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))
	if h.spotify == nil {
		responses.ResponseError(c, responses.NewError("Spotify chưa được cấu hình", http.StatusServiceUnavailable))
		return
	}
	tracks, err := h.spotify.SearchTracks(c.Request.Context(), query, limit, offset)
	if err != nil {
		log.Printf("spotify search unavailable, falling back to Audius: %v", err)
		c.Header("X-Music-Provider", "audius-fallback")
		responses.ResponseSuccess(
			c,
			http.StatusOK,
			"Spotify tạm không khả dụng, chuyển sang Audius",
			responses.ResponseData{Data: []spotify.Track{}},
		)
		return
	}
	c.Header("X-Music-Provider", "spotify")
	responses.ResponseSuccess(
		c,
		http.StatusOK,
		"tìm bài hát Spotify thành công",
		responses.ResponseData{Data: tracks},
	)
}

func (h *Handler) GetSpotifyRecommendations(c *gin.Context) {
	if h.spotify == nil {
		responses.ResponseError(c, responses.NewError("Spotify chưa được cấu hình", http.StatusServiceUnavailable))
		return
	}
	seedTrack := strings.TrimSpace(c.Query("seed_track"))
	seedArtist := strings.TrimSpace(c.Query("seed_artist"))
	seedGenre := strings.TrimSpace(c.Query("seed_genre"))
	if seedTrack == "" && seedArtist == "" && seedGenre == "" {
		responses.ResponseError(c, responses.ErrBadRequest("cần ít nhất một trong seed_track, seed_artist hoặc seed_genre"))
		return
	}
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "12"))

	params := spotify.RecommendParams{Limit: limit}
	if seedTrack != "" {
		params.SeedTrackIDs = strings.Split(seedTrack, ",")
	}
	if seedArtist != "" {
		params.SeedArtistIDs = strings.Split(seedArtist, ",")
	}
	if seedGenre != "" {
		params.SeedGenres = strings.Split(seedGenre, ",")
	}

	tracks, err := h.spotify.GetRecommendations(c.Request.Context(), params)
	if err != nil {
		log.Printf("spotify recommendations error: %v", err)
		responses.ResponseSuccess(
			c,
			http.StatusOK,
			"Spotify tạm không khả dụng",
			responses.ResponseData{Data: []spotify.Track{}},
		)
		return
	}
	c.Header("X-Music-Provider", "spotify")
	responses.ResponseSuccess(c, http.StatusOK, "lấy gợi ý thành công", responses.ResponseData{Data: tracks})
}

func (h *Handler) ListLibrary(c *gin.Context) {
	userUUID, err := httpctx.UserUUID(c)
	if err != nil {
		responses.ResponseError(c, responses.ErrUnauthorized("chưa đăng nhập"))
		return
	}
	items, err := h.libraryQuery.List(c.Request.Context(), userUUID)
	if err != nil {
		responses.ResponseError(c, err)
		return
	}
	responses.ResponseSuccess(c, http.StatusOK, "lấy thư viện thành công", responses.ResponseData{Data: items})
}

func (h *Handler) AddLibraryItem(c *gin.Context) {
	userUUID, err := httpctx.UserUUID(c)
	if err != nil {
		responses.ResponseError(c, responses.ErrUnauthorized("chưa đăng nhập"))
		return
	}
	var req librarydto.AddItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		responses.ResponseError(c, responses.ErrBadRequest(err.Error()))
		return
	}
	item, err := h.libraryUseCase.Add(c.Request.Context(), userUUID, req)
	if err != nil {
		responses.ResponseError(c, err)
		return
	}
	responses.ResponseSuccess(c, http.StatusCreated, "đã thêm vào thư viện", responses.ResponseData{Data: item})
}

func (h *Handler) RemoveLibraryItem(c *gin.Context) {
	userUUID, err := httpctx.UserUUID(c)
	if err != nil {
		responses.ResponseError(c, responses.ErrUnauthorized("chưa đăng nhập"))
		return
	}
	itemID, err := strconv.ParseUint(c.Param("item_id"), 10, 64)
	if err != nil || itemID == 0 {
		responses.ResponseError(c, responses.ErrBadRequest("item_id không hợp lệ"))
		return
	}
	if err := h.libraryUseCase.Remove(c.Request.Context(), userUUID, itemID); err != nil {
		responses.ResponseError(c, err)
		return
	}
	responses.ResponseSuccess(c, http.StatusOK, "đã xóa khỏi thư viện", responses.ResponseData{Data: gin.H{"id": itemID}})
}

func (h *Handler) ListLiked(c *gin.Context) {
	userUUID, err := httpctx.UserUUID(c)
	if err != nil {
		responses.ResponseError(c, responses.ErrUnauthorized("chưa đăng nhập"))
		return
	}
	items, err := h.likedQuery.List(c.Request.Context(), userUUID)
	if err != nil {
		responses.ResponseError(c, err)
		return
	}
	responses.ResponseSuccess(c, http.StatusOK, "lấy danh sách yêu thích thành công", responses.ResponseData{Data: items})
}

func (h *Handler) Like(c *gin.Context) {
	userUUID, err := httpctx.UserUUID(c)
	if err != nil {
		responses.ResponseError(c, responses.ErrUnauthorized("chưa đăng nhập"))
		return
	}
	var req mediadto.MediaItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		responses.ResponseError(c, responses.ErrBadRequest(err.Error()))
		return
	}
	item, err := h.likedUseCase.Like(c.Request.Context(), userUUID, req)
	if err != nil {
		responses.ResponseError(c, err)
		return
	}
	responses.ResponseSuccess(c, http.StatusCreated, "đã thích bài hát", responses.ResponseData{Data: item})
}

func (h *Handler) Unlike(c *gin.Context) {
	userUUID, err := httpctx.UserUUID(c)
	if err != nil {
		responses.ResponseError(c, responses.ErrUnauthorized("chưa đăng nhập"))
		return
	}
	sourceID := strings.TrimSpace(c.Param("source_id"))
	mediaType := strings.TrimSpace(c.Query("type"))
	if sourceID == "" || mediaType == "" {
		responses.ResponseError(c, responses.ErrBadRequest("source_id và type là bắt buộc"))
		return
	}
	if err := h.likedUseCase.Unlike(c.Request.Context(), userUUID, sourceID, mediaType); err != nil {
		responses.ResponseError(c, err)
		return
	}
	responses.ResponseSuccess(c, http.StatusOK, "đã bỏ thích", responses.ResponseData{Data: gin.H{"source_id": sourceID, "type": mediaType}})
}

func (h *Handler) ListRecent(c *gin.Context) {
	userUUID, err := httpctx.UserUUID(c)
	if err != nil {
		responses.ResponseError(c, responses.ErrUnauthorized("chưa đăng nhập"))
		return
	}
	items, err := h.historyQuery.List(c.Request.Context(), userUUID)
	if err != nil {
		responses.ResponseError(c, err)
		return
	}
	responses.ResponseSuccess(c, http.StatusOK, "lấy lịch sử nghe thành công", responses.ResponseData{Data: items})
}

func (h *Handler) AddRecent(c *gin.Context) {
	userUUID, err := httpctx.UserUUID(c)
	if err != nil {
		responses.ResponseError(c, responses.ErrUnauthorized("chưa đăng nhập"))
		return
	}
	var req mediadto.MediaItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		responses.ResponseError(c, responses.ErrBadRequest(err.Error()))
		return
	}
	item, err := h.historyUseCase.Add(c.Request.Context(), userUUID, req)
	if err != nil {
		responses.ResponseError(c, err)
		return
	}
	responses.ResponseSuccess(c, http.StatusCreated, "đã lưu lịch sử nghe", responses.ResponseData{Data: item})
}

func (h *Handler) ListSearchHistory(c *gin.Context) {
	userUUID, err := httpctx.UserUUID(c)
	if err != nil {
		responses.ResponseError(c, responses.ErrUnauthorized("chưa đăng nhập"))
		return
	}
	items, err := h.searchQuery.List(c.Request.Context(), userUUID)
	if err != nil {
		responses.ResponseError(c, err)
		return
	}
	responses.ResponseSuccess(c, http.StatusOK, "lấy lịch sử tìm kiếm thành công", responses.ResponseData{Data: items})
}

func (h *Handler) AddSearchHistory(c *gin.Context) {
	userUUID, err := httpctx.UserUUID(c)
	if err != nil {
		responses.ResponseError(c, responses.ErrUnauthorized("chưa đăng nhập"))
		return
	}
	var req searchdto.AddSearchHistoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		responses.ResponseError(c, responses.ErrBadRequest(err.Error()))
		return
	}
	item, err := h.searchUseCase.Add(c.Request.Context(), userUUID, req.Keyword)
	if err != nil {
		responses.ResponseError(c, err)
		return
	}
	responses.ResponseSuccess(c, http.StatusCreated, "đã lưu lịch sử tìm kiếm", responses.ResponseData{Data: item})
}

func (h *Handler) DeleteSearchHistory(c *gin.Context) {
	userUUID, err := httpctx.UserUUID(c)
	if err != nil {
		responses.ResponseError(c, responses.ErrUnauthorized("chưa đăng nhập"))
		return
	}
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil || id == 0 {
		responses.ResponseError(c, responses.ErrBadRequest("id không hợp lệ"))
		return
	}
	if err := h.searchUseCase.Delete(c.Request.Context(), userUUID, id); err != nil {
		responses.ResponseError(c, err)
		return
	}
	responses.ResponseSuccess(c, http.StatusOK, "đã xóa lịch sử tìm kiếm", responses.ResponseData{Data: gin.H{"id": id}})
}

func (h *Handler) ClearSearchHistory(c *gin.Context) {
	userUUID, err := httpctx.UserUUID(c)
	if err != nil {
		responses.ResponseError(c, responses.ErrUnauthorized("chưa đăng nhập"))
		return
	}
	if err := h.searchUseCase.Clear(c.Request.Context(), userUUID); err != nil {
		responses.ResponseError(c, err)
		return
	}
	responses.ResponseSuccess(c, http.StatusOK, "đã xóa toàn bộ lịch sử tìm kiếm", responses.ResponseData{Data: nil})
}

func (h *Handler) ListPlaylists(c *gin.Context) {
	userUUID, err := httpctx.UserUUID(c)
	if err != nil {
		responses.ResponseError(c, responses.ErrUnauthorized("chưa đăng nhập"))
		return
	}
	items, err := h.playlistQuery.List(c.Request.Context(), userUUID)
	if err != nil {
		responses.ResponseError(c, err)
		return
	}
	responses.ResponseSuccess(c, http.StatusOK, "lấy playlist thành công", responses.ResponseData{Data: items})
}

func (h *Handler) CreatePlaylist(c *gin.Context) {
	userUUID, err := httpctx.UserUUID(c)
	if err != nil {
		responses.ResponseError(c, responses.ErrUnauthorized("chưa đăng nhập"))
		return
	}
	var req playlistdto.CreatePlaylistRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		responses.ResponseError(c, responses.ErrBadRequest(err.Error()))
		return
	}
	p, err := h.playlistUseCase.Create(c.Request.Context(), userUUID, req)
	if err != nil {
		responses.ResponseError(c, err)
		return
	}
	responses.ResponseSuccess(c, http.StatusCreated, "đã tạo playlist", responses.ResponseData{Data: p})
}

func (h *Handler) AddPlaylistTrack(c *gin.Context) {
	userUUID, err := httpctx.UserUUID(c)
	if err != nil {
		responses.ResponseError(c, responses.ErrUnauthorized("chưa đăng nhập"))
		return
	}
	playlistID64, err := strconv.ParseUint(c.Param("playlist_id"), 10, 64)
	if err != nil || playlistID64 == 0 {
		responses.ResponseError(c, responses.ErrBadRequest("playlist_id không hợp lệ"))
		return
	}
	var req playlistdto.AddPlaylistTrackRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		responses.ResponseError(c, responses.ErrBadRequest(err.Error()))
		return
	}
	item, err := h.playlistUseCase.AddTrack(c.Request.Context(), userUUID, playlistID64, req)
	if err != nil {
		responses.ResponseError(c, err)
		return
	}
	responses.ResponseSuccess(c, http.StatusCreated, "đã thêm bài vào playlist", responses.ResponseData{Data: item})
}

func (h *Handler) DeletePlaylist(c *gin.Context) {
	userUUID, err := httpctx.UserUUID(c)
	if err != nil {
		responses.ResponseError(c, responses.ErrUnauthorized("chưa đăng nhập"))
		return
	}
	playlistID, err := strconv.ParseUint(c.Param("playlist_id"), 10, 64)
	if err != nil || playlistID == 0 {
		responses.ResponseError(c, responses.ErrBadRequest("playlist_id không hợp lệ"))
		return
	}
	if err := h.playlistUseCase.Delete(c.Request.Context(), userUUID, playlistID); err != nil {
		responses.ResponseError(c, err)
		return
	}
	responses.ResponseSuccess(c, http.StatusOK, "đã xóa playlist", responses.ResponseData{Data: gin.H{"id": playlistID}})
}

// ─── Listening Events ─────────────────────────────────────────────────────────

func (h *Handler) TrackListeningEvent(c *gin.Context) {
	userUUID, err := httpctx.UserUUID(c)
	if err != nil {
		responses.ResponseError(c, responses.ErrUnauthorized("chưa đăng nhập"))
		return
	}
	var req eventdto.AddListeningEventRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		responses.ResponseError(c, responses.ErrBadRequest(err.Error()))
		return
	}
	result, err := h.listeningUseCase.Track(c.Request.Context(), userUUID, req)
	if err != nil {
		responses.ResponseError(c, err)
		return
	}
	responses.ResponseSuccess(c, http.StatusCreated, "đã ghi nhận sự kiện", responses.ResponseData{Data: result})
}

func (h *Handler) ListListeningEvents(c *gin.Context) {
	userUUID, err := httpctx.UserUUID(c)
	if err != nil {
		responses.ResponseError(c, responses.ErrUnauthorized("chưa đăng nhập"))
		return
	}
	limit := 100
	if v := c.Query("limit"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			limit = n
		}
	}
	events, err := h.listeningQuery.RecentEvents(c.Request.Context(), userUUID, limit)
	if err != nil {
		responses.ResponseError(c, err)
		return
	}
	responses.ResponseSuccess(c, http.StatusOK, "lấy lịch sử nghe thành công", responses.ResponseData{Data: events})
}

func (h *Handler) GetUserDNA(c *gin.Context) {
	userUUID, err := httpctx.UserUUID(c)
	if err != nil {
		responses.ResponseError(c, responses.ErrUnauthorized("chưa đăng nhập"))
		return
	}
	dna, err := h.listeningQuery.DNA(c.Request.Context(), userUUID)
	if err != nil {
		responses.ResponseError(c, err)
		return
	}
	responses.ResponseSuccess(c, http.StatusOK, "lấy listening DNA thành công", responses.ResponseData{Data: dna})
}
