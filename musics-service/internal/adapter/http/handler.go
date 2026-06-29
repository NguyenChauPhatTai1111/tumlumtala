package http

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/tumlumtala/musics-service/internal/common/httpctx"
	"github.com/tumlumtala/musics-service/internal/common/responses"
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
	}
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
