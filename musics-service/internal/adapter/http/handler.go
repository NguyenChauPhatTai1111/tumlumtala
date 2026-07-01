package http

import (
	"log"
	"net/http"
	"strconv"
	"strings"
	"sync"

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

func (h *Handler) SearchSpotifyArtists(c *gin.Context) {
	query := strings.TrimSpace(c.Query("q"))
	if query == "" {
		responses.ResponseError(c, responses.ErrBadRequest("q không được để trống"))
		return
	}
	if h.spotify == nil {
		responses.ResponseError(c, responses.NewError("Spotify chưa được cấu hình", http.StatusServiceUnavailable))
		return
	}
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	items, err := h.spotify.SearchArtists(c.Request.Context(), query, limit)
	if err != nil {
		log.Printf("spotify artist search error: %v", err)
		responses.ResponseSuccess(c, http.StatusOK, "Spotify tạm không khả dụng", responses.ResponseData{Data: []spotify.ArtistSummary{}})
		return
	}
	c.Header("X-Music-Provider", "spotify")
	responses.ResponseSuccess(c, http.StatusOK, "tìm nghệ sĩ Spotify thành công", responses.ResponseData{Data: items})
}

func (h *Handler) SearchSpotifyPlaylists(c *gin.Context) {
	query := strings.TrimSpace(c.Query("q"))
	if query == "" {
		responses.ResponseError(c, responses.ErrBadRequest("q không được để trống"))
		return
	}
	if h.spotify == nil {
		responses.ResponseError(c, responses.NewError("Spotify chưa được cấu hình", http.StatusServiceUnavailable))
		return
	}
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	items, err := h.spotify.SearchCollections(c.Request.Context(), query, "playlist", limit)
	if err != nil {
		log.Printf("spotify playlist search error: %v", err)
		responses.ResponseSuccess(c, http.StatusOK, "Spotify tạm không khả dụng", responses.ResponseData{Data: []spotify.CollectionSummary{}})
		return
	}
	c.Header("X-Music-Provider", "spotify")
	responses.ResponseSuccess(c, http.StatusOK, "tìm playlist Spotify thành công", responses.ResponseData{Data: items})
}

func (h *Handler) GetSpotifyDiscovery(c *gin.Context) {
	if h.spotify == nil {
		responses.ResponseError(c, responses.NewError("Spotify chưa được cấu hình", http.StatusServiceUnavailable))
		return
	}
	section := strings.TrimSpace(c.Param("section"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "16"))
	var (
		data any
		err  error
	)
	switch section {
	case "tracks":
		data, err = h.spotify.DiscoverTracks(
			c.Request.Context(),
			c.Query("genre"),
			c.DefaultQuery("time", "week"),
			limit,
		)
	case "artists":
		data, err = h.spotify.DiscoverArtists(c.Request.Context(), limit)
	case "albums":
		data, err = h.spotify.DiscoverAlbums(c.Request.Context(), limit)
	case "playlists":
		data, err = h.spotify.DiscoverPlaylists(c.Request.Context(), limit)
	default:
		responses.ResponseError(c, responses.ErrBadRequest("section phải là tracks, artists, albums hoặc playlists"))
		return
	}
	if err != nil {
		log.Printf("spotify discovery %s error: %v", section, err)
		responses.ResponseError(c, responses.NewError("Không thể lấy dữ liệu khám phá Spotify", http.StatusBadGateway))
		return
	}
	c.Header("X-Music-Provider", "spotify")
	responses.ResponseSuccess(c, http.StatusOK, "lấy dữ liệu khám phá Spotify thành công", responses.ResponseData{Data: data})
}

func (h *Handler) GetSpotifyTrack(c *gin.Context) {
	trackID := strings.TrimSpace(c.Param("track_id"))
	if trackID == "" {
		responses.ResponseError(c, responses.ErrBadRequest("track_id không được để trống"))
		return
	}
	if h.spotify == nil {
		responses.ResponseError(c, responses.NewError("Spotify chưa được cấu hình", http.StatusServiceUnavailable))
		return
	}
	track, err := h.spotify.GetTrack(c.Request.Context(), trackID)
	if err != nil {
		log.Printf("spotify get track error: %v", err)
		responses.ResponseError(c, responses.NewError("Không thể lấy thông tin bài hát", http.StatusBadGateway))
		return
	}
	c.Header("X-Music-Provider", "spotify")
	responses.ResponseSuccess(c, http.StatusOK, "lấy thông tin bài hát thành công", responses.ResponseData{Data: track})
}

func (h *Handler) GetSpotifyRecommendations(c *gin.Context) {
	if h.spotify == nil {
		responses.ResponseError(c, responses.NewError("Spotify chưa được cấu hình", http.StatusServiceUnavailable))
		return
	}
	seedArtist := strings.TrimSpace(c.Query("seed_artist"))
	seedGenre := strings.TrimSpace(c.Query("seed_genre"))
	seedTrack := strings.TrimSpace(c.Query("seed_track"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "12"))
	if limit < 1 {
		limit = 12
	}
	if seedTrack == "" && seedArtist == "" && seedGenre == "" {
		responses.ResponseError(c, responses.ErrBadRequest("cần ít nhất một trong seed_track, seed_artist hoặc seed_genre"))
		return
	}

	tracks, err := h.spotify.GetSimilarTracks(c.Request.Context(), seedTrack, seedArtist, seedGenre, limit)
	if err != nil {
		log.Printf("spotify similar tracks error: %v", err)
		responses.ResponseSuccess(c, http.StatusOK, "Spotify tạm không khả dụng", responses.ResponseData{Data: []spotify.Track{}})
		return
	}
	c.Header("X-Music-Provider", "spotify")
	responses.ResponseSuccess(c, http.StatusOK, "lấy gợi ý thành công", responses.ResponseData{Data: tracks})
}

func (h *Handler) GetSpotifyArtist(c *gin.Context) {
	artistID := strings.TrimSpace(c.Param("artist_id"))
	if artistID == "" {
		responses.ResponseError(c, responses.ErrBadRequest("artist_id không được để trống"))
		return
	}
	if h.spotify == nil {
		responses.ResponseError(c, responses.NewError("Spotify chưa được cấu hình", http.StatusServiceUnavailable))
		return
	}
	detail, err := h.spotify.GetArtist(c.Request.Context(), artistID)
	if err != nil {
		log.Printf("spotify get artist error: %v", err)
		responses.ResponseError(c, responses.NewError("Không thể lấy thông tin nghệ sĩ", http.StatusBadGateway))
		return
	}

	ctx := c.Request.Context()
	var (
		mu           sync.Mutex
		topTracks    []spotify.Track
		albums       []spotify.AlbumSummary
		appearsOn    []spotify.AlbumSummary
		playlists    []spotify.CollectionSummary
		related      []spotify.ArtistSummary
		albumsTotal  int
		appearsTotal int
	)
	var wg sync.WaitGroup

	wg.Add(1)
	go func() {
		defer wg.Done()
		t, _ := h.spotify.GetArtistTopTracks(ctx, artistID, detail.Name)
		if t == nil {
			t = []spotify.Track{}
		}
		mu.Lock()
		topTracks = t
		mu.Unlock()
	}()

	wg.Add(1)
	go func() {
		defer wg.Done()
		a, total, _ := h.spotify.GetArtistAlbums(ctx, artistID, 20, 0)
		if a == nil {
			a = []spotify.AlbumSummary{}
		}
		mu.Lock()
		albums = a
		albumsTotal = total
		mu.Unlock()
	}()

	wg.Add(1)
	go func() {
		defer wg.Done()
		a, total, _ := h.spotify.GetArtistAppearsOn(ctx, artistID, 20, 0)
		if a == nil {
			a = []spotify.AlbumSummary{}
		}
		mu.Lock()
		appearsOn = a
		appearsTotal = total
		mu.Unlock()
	}()

	wg.Add(1)
	go func() {
		defer wg.Done()
		items, _ := h.spotify.SearchCollections(ctx, detail.Name, "playlist", 10)
		if items == nil {
			items = []spotify.CollectionSummary{}
		}
		mu.Lock()
		playlists = items
		mu.Unlock()
	}()

	wg.Add(1)
	go func() {
		defer wg.Done()
		query := detail.Name
		if len(detail.Genres) > 0 {
			query = `genre:"` + detail.Genres[0] + `"`
		}
		items, _ := h.spotify.SearchArtists(ctx, query, 10)
		filtered := make([]spotify.ArtistSummary, 0, len(items))
		for _, item := range items {
			if item.ID != detail.ID {
				filtered = append(filtered, item)
			}
		}
		mu.Lock()
		related = filtered
		mu.Unlock()
	}()

	wg.Wait()

	if detail.Genres == nil {
		detail.Genres = []string{}
	}

	type artistFullResponse struct {
		Artist       *spotify.ArtistDetail       `json:"artist"`
		TopTracks    []spotify.Track             `json:"top_tracks"`
		Albums       []spotify.AlbumSummary      `json:"albums"`
		AlbumsTotal  int                         `json:"albums_total"`
		AppearsOn    []spotify.AlbumSummary      `json:"appears_on"`
		AppearsTotal int                         `json:"appears_total"`
		Playlists    []spotify.CollectionSummary `json:"playlists"`
		Related      []spotify.ArtistSummary     `json:"related_artists"`
	}
	c.Header("X-Music-Provider", "spotify")
	responses.ResponseSuccess(c, http.StatusOK, "lấy thông tin nghệ sĩ thành công", responses.ResponseData{
		Data: artistFullResponse{
			Artist:       detail,
			TopTracks:    topTracks,
			Albums:       albums,
			AlbumsTotal:  albumsTotal,
			AppearsOn:    appearsOn,
			AppearsTotal: appearsTotal,
			Playlists:    playlists,
			Related:      related,
		},
	})
}

func (h *Handler) GetSpotifyArtistDiscography(c *gin.Context) {
	artistID := strings.TrimSpace(c.Param("artist_id"))
	if artistID == "" {
		responses.ResponseError(c, responses.ErrBadRequest("artist_id không được để trống"))
		return
	}
	if h.spotify == nil {
		responses.ResponseError(c, responses.NewError("Spotify chưa được cấu hình", http.StatusServiceUnavailable))
		return
	}
	artist, err := h.spotify.GetArtist(c.Request.Context(), artistID)
	if err != nil {
		log.Printf("spotify get artist for discography error: %v", err)
		responses.ResponseError(c, responses.NewError("Không thể lấy thông tin nghệ sĩ", http.StatusBadGateway))
		return
	}
	albums, total, err := h.spotify.GetArtistAlbums(c.Request.Context(), artistID, 50, 0)
	if err != nil {
		log.Printf("spotify get artist discography error: %v", err)
		responses.ResponseError(c, responses.NewError("Không thể lấy discography nghệ sĩ", http.StatusBadGateway))
		return
	}
	if albums == nil {
		albums = []spotify.AlbumSummary{}
	}
	c.Header("X-Music-Provider", "spotify")
	responses.ResponseSuccess(c, http.StatusOK, "lấy discography nghệ sĩ thành công", responses.ResponseData{
		Data: gin.H{"artist": artist, "albums": albums, "total": total},
	})
}

func (h *Handler) GetSpotifyAlbum(c *gin.Context) {
	albumID := strings.TrimSpace(c.Param("album_id"))
	if albumID == "" {
		responses.ResponseError(c, responses.ErrBadRequest("album_id không được để trống"))
		return
	}
	if h.spotify == nil {
		responses.ResponseError(c, responses.NewError("Spotify chưa được cấu hình", http.StatusServiceUnavailable))
		return
	}
	album, err := h.spotify.GetAlbum(c.Request.Context(), albumID)
	if err != nil {
		log.Printf("spotify get album error: %v", err)
		responses.ResponseError(c, responses.NewError("Không thể lấy thông tin album", http.StatusBadGateway))
		return
	}
	c.Header("X-Music-Provider", "spotify")
	responses.ResponseSuccess(c, http.StatusOK, "lấy thông tin album thành công", responses.ResponseData{
		Data: album,
	})
}

func (h *Handler) GetSpotifyAlbumTracks(c *gin.Context) {
	albumID := strings.TrimSpace(c.Param("album_id"))
	if albumID == "" {
		responses.ResponseError(c, responses.ErrBadRequest("album_id không được để trống"))
		return
	}
	if h.spotify == nil {
		responses.ResponseError(c, responses.NewError("Spotify chưa được cấu hình", http.StatusServiceUnavailable))
		return
	}
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))
	tracks, total, err := h.spotify.GetAlbumTracks(c.Request.Context(), albumID, limit, offset)
	if err != nil {
		log.Printf("spotify get album tracks error: %v", err)
		responses.ResponseError(c, responses.NewError("Không thể lấy danh sách bài hát", http.StatusBadGateway))
		return
	}
	c.Header("X-Music-Provider", "spotify")
	responses.ResponseSuccess(c, http.StatusOK, "lấy danh sách bài hát thành công", responses.ResponseData{
		Data: gin.H{"tracks": tracks, "total": total, "limit": limit, "offset": offset},
	})
}

func (h *Handler) GetSpotifyNewReleases(c *gin.Context) {
	if h.spotify == nil {
		responses.ResponseError(c, responses.NewError("Spotify chưa được cấu hình", http.StatusServiceUnavailable))
		return
	}
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	items, err := h.spotify.GetNewReleases(c.Request.Context(), limit)
	if err != nil {
		log.Printf("spotify new releases error: %v", err)
		responses.ResponseError(c, responses.NewError("Không thể lấy bản phát hành mới", http.StatusBadGateway))
		return
	}
	c.Header("X-Music-Provider", "spotify")
	responses.ResponseSuccess(c, http.StatusOK, "lấy bản phát hành mới thành công", responses.ResponseData{Data: items})
}

func (h *Handler) GetSpotifyFeaturedPlaylists(c *gin.Context) {
	if h.spotify == nil {
		responses.ResponseError(c, responses.NewError("Spotify chưa được cấu hình", http.StatusServiceUnavailable))
		return
	}
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	items, err := h.spotify.GetFeaturedPlaylists(c.Request.Context(), limit)
	if err != nil {
		log.Printf("spotify featured playlists error: %v", err)
		responses.ResponseError(c, responses.NewError("Không thể lấy playlist nổi bật", http.StatusBadGateway))
		return
	}
	c.Header("X-Music-Provider", "spotify")
	responses.ResponseSuccess(c, http.StatusOK, "lấy playlist nổi bật thành công", responses.ResponseData{Data: items})
}

func (h *Handler) GetSpotifyCategories(c *gin.Context) {
	if h.spotify == nil {
		responses.ResponseError(c, responses.NewError("Spotify chưa được cấu hình", http.StatusServiceUnavailable))
		return
	}
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	items, err := h.spotify.GetCategories(c.Request.Context(), limit)
	if err != nil {
		log.Printf("spotify categories error: %v", err)
		responses.ResponseError(c, responses.NewError("Không thể lấy danh mục", http.StatusBadGateway))
		return
	}
	c.Header("X-Music-Provider", "spotify")
	responses.ResponseSuccess(c, http.StatusOK, "lấy danh mục thành công", responses.ResponseData{Data: items})
}

func (h *Handler) GetSpotifyCategoryPlaylists(c *gin.Context) {
	categoryID := strings.TrimSpace(c.Param("category_id"))
	if categoryID == "" {
		responses.ResponseError(c, responses.ErrBadRequest("category_id không được để trống"))
		return
	}
	if h.spotify == nil {
		responses.ResponseError(c, responses.NewError("Spotify chưa được cấu hình", http.StatusServiceUnavailable))
		return
	}
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	items, err := h.spotify.GetCategoryPlaylists(c.Request.Context(), categoryID, limit)
	if err != nil {
		log.Printf("spotify category playlists error: %v", err)
		responses.ResponseError(c, responses.NewError("Không thể lấy playlist theo danh mục", http.StatusBadGateway))
		return
	}
	c.Header("X-Music-Provider", "spotify")
	responses.ResponseSuccess(c, http.StatusOK, "lấy playlist theo danh mục thành công", responses.ResponseData{Data: items})
}

func (h *Handler) GetSpotifyPlaylist(c *gin.Context) {
	playlistID := strings.TrimSpace(c.Param("playlist_id"))
	if playlistID == "" {
		responses.ResponseError(c, responses.ErrBadRequest("playlist_id không được để trống"))
		return
	}
	if h.spotify == nil {
		responses.ResponseError(c, responses.NewError("Spotify chưa được cấu hình", http.StatusServiceUnavailable))
		return
	}
	playlist, err := h.spotify.GetPlaylist(c.Request.Context(), playlistID)
	if err != nil {
		log.Printf("spotify get playlist error: %v", err)
		responses.ResponseError(c, responses.NewError("Không thể lấy thông tin playlist", http.StatusBadGateway))
		return
	}
	c.Header("X-Music-Provider", "spotify")
	responses.ResponseSuccess(c, http.StatusOK, "lấy thông tin playlist thành công", responses.ResponseData{Data: playlist})
}

func (h *Handler) GetSpotifyPlaylistTracks(c *gin.Context) {
	playlistID := strings.TrimSpace(c.Param("playlist_id"))
	if playlistID == "" {
		responses.ResponseError(c, responses.ErrBadRequest("playlist_id không được để trống"))
		return
	}
	if h.spotify == nil {
		responses.ResponseError(c, responses.NewError("Spotify chưa được cấu hình", http.StatusServiceUnavailable))
		return
	}
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))
	tracks, total, err := h.spotify.GetPlaylistTracks(c.Request.Context(), playlistID, limit, offset)
	if err != nil {
		log.Printf("spotify get playlist tracks error: %v", err)
		responses.ResponseError(c, responses.NewError("Không thể lấy danh sách bài hát", http.StatusBadGateway))
		return
	}
	c.Header("X-Music-Provider", "spotify")
	responses.ResponseSuccess(c, http.StatusOK, "lấy danh sách bài hát thành công", responses.ResponseData{
		Data: gin.H{"tracks": tracks, "total": total, "limit": limit, "offset": offset},
	})
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
