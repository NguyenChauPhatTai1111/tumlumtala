package http

import (
	"math"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/tumlumtala/movies-service/internal/common/httpctx"
	"github.com/tumlumtala/movies-service/internal/common/responses"
	"github.com/tumlumtala/movies-service/internal/module/application/dto"
	certuc "github.com/tumlumtala/movies-service/internal/module/application/usecase/certification"
	likeduc "github.com/tumlumtala/movies-service/internal/module/application/usecase/liked"
	searchuc "github.com/tumlumtala/movies-service/internal/module/application/usecase/search"
	seasonuc "github.com/tumlumtala/movies-service/internal/module/application/usecase/season"
	watchuc "github.com/tumlumtala/movies-service/internal/module/application/usecase/watch"
)

type Handler struct {
	watchQuery    *watchuc.WatchHistoryQueryUseCase
	watchCmd      *watchuc.WatchHistoryUseCase
	searchQuery   *searchuc.SearchHistoryQueryUseCase
	searchCmd     *searchuc.SearchHistoryUseCase
	likedQuery    *likeduc.LikedMovieQueryUseCase
	likedCmd      *likeduc.LikedMovieUseCase
	certQuery     *certuc.CertificationQueryUseCase
	seasonQuery   *seasonuc.SeasonQueryUseCase
	seasonCmd     *seasonuc.SeasonUseCase
}

func NewHandler(
	watchQuery *watchuc.WatchHistoryQueryUseCase,
	watchCmd *watchuc.WatchHistoryUseCase,
	searchQuery *searchuc.SearchHistoryQueryUseCase,
	searchCmd *searchuc.SearchHistoryUseCase,
	likedQuery *likeduc.LikedMovieQueryUseCase,
	likedCmd *likeduc.LikedMovieUseCase,
	certQuery *certuc.CertificationQueryUseCase,
	seasonQuery *seasonuc.SeasonQueryUseCase,
	seasonCmd *seasonuc.SeasonUseCase,
) *Handler {
	return &Handler{
		watchQuery:  watchQuery,
		watchCmd:    watchCmd,
		searchQuery: searchQuery,
		searchCmd:   searchCmd,
		likedQuery:  likedQuery,
		likedCmd:    likedCmd,
		certQuery:   certQuery,
		seasonQuery: seasonQuery,
		seasonCmd:   seasonCmd,
	}
}

func parsePage(c *gin.Context) (page, limit int) {
	page, _ = strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ = strconv.Atoi(c.DefaultQuery("limit", "48"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 48
	}
	return
}

func (h *Handler) ListWatchHistory(c *gin.Context) {
	userUUID, err := httpctx.UserUUID(c)
	if err != nil {
		responses.ResponseError(c, responses.ErrUnauthorized("chưa đăng nhập"))
		return
	}
	page, limit := parsePage(c)
	items, total, err := h.watchQuery.ListPaged(c.Request.Context(), userUUID, page, limit)
	if err != nil {
		responses.ResponseError(c, err)
		return
	}
	totalPages := int(math.Ceil(float64(total) / float64(limit)))
	responses.ResponseSuccess(c, http.StatusOK, "lấy lịch sử xem phim thành công", responses.ResponseData{
		Data: items,
		Pagination: map[string]any{
			"total": total, "page": page, "limit": limit, "total_pages": totalPages,
		},
	})
}

func (h *Handler) AddWatchHistory(c *gin.Context) {
	userUUID, err := httpctx.UserUUID(c)
	if err != nil {
		responses.ResponseError(c, responses.ErrUnauthorized("chưa đăng nhập"))
		return
	}
	var req dto.AddWatchHistoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		responses.ResponseValidator(c, gin.H{"error": err.Error()})
		return
	}
	item, err := h.watchCmd.Add(c.Request.Context(), userUUID, req)
	if err != nil {
		responses.ResponseError(c, err)
		return
	}
	responses.ResponseSuccess(c, http.StatusCreated, "đã lưu lịch sử xem phim", responses.ResponseData{Data: item})
}

func (h *Handler) DeleteWatchHistory(c *gin.Context) {
	userUUID, err := httpctx.UserUUID(c)
	if err != nil {
		responses.ResponseError(c, responses.ErrUnauthorized("chưa đăng nhập"))
		return
	}
	if err := h.watchCmd.Delete(c.Request.Context(), userUUID, c.Param("slug")); err != nil {
		responses.ResponseError(c, err)
		return
	}
	responses.ResponseSuccess(c, http.StatusOK, "đã xóa khỏi lịch sử xem", responses.ResponseData{})
}

func (h *Handler) DeleteWatchHistoryAll(c *gin.Context) {
	userUUID, err := httpctx.UserUUID(c)
	if err != nil {
		responses.ResponseError(c, responses.ErrUnauthorized("chưa đăng nhập"))
		return
	}
	if err := h.watchCmd.BulkDelete(c.Request.Context(), userUUID); err != nil {
		responses.ResponseError(c, err)
		return
	}
	responses.ResponseSuccess(c, http.StatusOK, "đã xóa toàn bộ lịch sử xem", responses.ResponseData{})
}

func (h *Handler) UpdateWatchPosition(c *gin.Context) {
	userUUID, err := httpctx.UserUUID(c)
	if err != nil {
		responses.ResponseError(c, responses.ErrUnauthorized("chưa đăng nhập"))
		return
	}
	var req dto.UpdateWatchPositionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		responses.ResponseValidator(c, gin.H{"error": err.Error()})
		return
	}
	if err := h.watchCmd.UpdatePosition(c.Request.Context(), userUUID, c.Param("slug"), c.Query("episode_slug"), req.Position, req.Duration); err != nil {
		responses.ResponseError(c, err)
		return
	}
	responses.ResponseSuccess(c, http.StatusOK, "đã lưu vị trí xem", responses.ResponseData{})
}

func (h *Handler) GetWatchPosition(c *gin.Context) {
	userUUID, err := httpctx.UserUUID(c)
	if err != nil {
		responses.ResponseError(c, responses.ErrUnauthorized("chưa đăng nhập"))
		return
	}
	item, err := h.watchQuery.GetPosition(c.Request.Context(), userUUID, c.Param("slug"), c.Query("episode_slug"))
	if err != nil {
		responses.ResponseError(c, err)
		return
	}
	responses.ResponseSuccess(c, http.StatusOK, "lấy vị trí xem thành công", responses.ResponseData{Data: item})
}

func (h *Handler) ListEpisodePositions(c *gin.Context) {
	userUUID, err := httpctx.UserUUID(c)
	if err != nil {
		responses.ResponseError(c, responses.ErrUnauthorized("chưa đăng nhập"))
		return
	}
	items, err := h.watchQuery.ListEpisodePositions(c.Request.Context(), userUUID, c.Param("slug"))
	if err != nil {
		responses.ResponseError(c, err)
		return
	}
	responses.ResponseSuccess(c, http.StatusOK, "lấy vị trí các tập thành công", responses.ResponseData{Data: items})
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
	var req dto.AddSearchHistoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		responses.ResponseValidator(c, gin.H{"error": err.Error()})
		return
	}
	item, err := h.searchCmd.Add(c.Request.Context(), userUUID, req.Keyword)
	if err != nil {
		responses.ResponseError(c, err)
		return
	}
	responses.ResponseSuccess(c, http.StatusCreated, "đã lưu lịch sử tìm kiếm", responses.ResponseData{Data: item})
}

func (h *Handler) DeleteSearchHistoryOne(c *gin.Context) {
	userUUID, err := httpctx.UserUUID(c)
	if err != nil {
		responses.ResponseError(c, responses.ErrUnauthorized("chưa đăng nhập"))
		return
	}
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil || id == 0 {
		responses.ResponseError(c, responses.ErrBadRequest("id không hợp lệ"))
		return
	}
	if err := h.searchCmd.Delete(c.Request.Context(), userUUID, uint(id)); err != nil {
		responses.ResponseError(c, err)
		return
	}
	responses.ResponseSuccess(c, http.StatusOK, "đã xóa lịch sử tìm kiếm", responses.ResponseData{})
}

func (h *Handler) DeleteSearchHistoryAll(c *gin.Context) {
	userUUID, err := httpctx.UserUUID(c)
	if err != nil {
		responses.ResponseError(c, responses.ErrUnauthorized("chưa đăng nhập"))
		return
	}
	if err := h.searchCmd.BulkDelete(c.Request.Context(), userUUID); err != nil {
		responses.ResponseError(c, err)
		return
	}
	responses.ResponseSuccess(c, http.StatusOK, "đã xóa toàn bộ lịch sử tìm kiếm", responses.ResponseData{})
}

func (h *Handler) ListLikedMovies(c *gin.Context) {
	userUUID, err := httpctx.UserUUID(c)
	if err != nil {
		responses.ResponseError(c, responses.ErrUnauthorized("chưa đăng nhập"))
		return
	}
	page, limit := parsePage(c)
	items, total, err := h.likedQuery.ListPaged(c.Request.Context(), userUUID, page, limit)
	if err != nil {
		responses.ResponseError(c, err)
		return
	}
	totalPages := int(math.Ceil(float64(total) / float64(limit)))
	responses.ResponseSuccess(c, http.StatusOK, "lấy danh sách phim đã thích thành công", responses.ResponseData{
		Data: items,
		Pagination: map[string]any{
			"total": total, "page": page, "limit": limit, "total_pages": totalPages,
		},
	})
}

func (h *Handler) LikeMovie(c *gin.Context) {
	userUUID, err := httpctx.UserUUID(c)
	if err != nil {
		responses.ResponseError(c, responses.ErrUnauthorized("chưa đăng nhập"))
		return
	}
	var req dto.LikeMovieRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		responses.ResponseValidator(c, gin.H{"error": err.Error()})
		return
	}
	item, err := h.likedCmd.Like(c.Request.Context(), userUUID, req)
	if err != nil {
		responses.ResponseError(c, err)
		return
	}
	responses.ResponseSuccess(c, http.StatusCreated, "đã thích phim", responses.ResponseData{Data: item})
}

func (h *Handler) UnlikeMovie(c *gin.Context) {
	userUUID, err := httpctx.UserUUID(c)
	if err != nil {
		responses.ResponseError(c, responses.ErrUnauthorized("chưa đăng nhập"))
		return
	}
	if err := h.likedCmd.Unlike(c.Request.Context(), userUUID, c.Param("slug")); err != nil {
		responses.ResponseError(c, err)
		return
	}
	responses.ResponseSuccess(c, http.StatusOK, "đã bỏ thích phim", responses.ResponseData{})
}

func (h *Handler) BatchCertifications(c *gin.Context) {
	var req []certuc.MovieInput
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}
	if len(req) > 100 {
		req = req[:100]
	}
	result, err := h.certQuery.BatchGet(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *Handler) GetSeasons(c *gin.Context) {
	items, err := h.seasonQuery.GetSeasons(c.Request.Context(), c.Param("base_slug"))
	if err != nil {
		responses.ResponseError(c, err)
		return
	}
	responses.ResponseSuccess(c, http.StatusOK, "lấy danh sách season thành công", responses.ResponseData{Data: items})
}

func (h *Handler) UpsertSeasons(c *gin.Context) {
	var req dto.UpsertSeasonsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		responses.ResponseValidator(c, gin.H{"error": err.Error()})
		return
	}
	if err := h.seasonCmd.UpsertSeasons(c.Request.Context(), c.Param("base_slug"), req); err != nil {
		responses.ResponseError(c, err)
		return
	}
	responses.ResponseSuccess(c, http.StatusOK, "đã lưu seasons", responses.ResponseData{})
}

func (h *Handler) GetEpisodes(c *gin.Context) {
	seasonNumber, _ := strconv.Atoi(c.DefaultQuery("season", "1"))
	if seasonNumber < 1 {
		seasonNumber = 1
	}
	items, err := h.seasonQuery.GetEpisodes(c.Request.Context(), c.Param("base_slug"), seasonNumber)
	if err != nil {
		responses.ResponseError(c, err)
		return
	}
	responses.ResponseSuccess(c, http.StatusOK, "lấy danh sách tập thành công", responses.ResponseData{Data: items})
}

func (h *Handler) UpsertEpisodes(c *gin.Context) {
	var req dto.UpsertEpisodesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		responses.ResponseValidator(c, gin.H{"error": err.Error()})
		return
	}
	if err := h.seasonCmd.UpsertEpisodes(c.Request.Context(), c.Param("base_slug"), req); err != nil {
		responses.ResponseError(c, err)
		return
	}
	responses.ResponseSuccess(c, http.StatusOK, "đã lưu episodes", responses.ResponseData{})
}
