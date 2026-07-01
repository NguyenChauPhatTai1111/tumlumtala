package http

import (
	"github.com/gin-gonic/gin"

	"github.com/tumlumtala/musics-service/internal/middleware"
)

func RegisterRoutes(r *gin.Engine, h *Handler, jwtSecret string) {
	auth := middleware.AuthMiddleware(jwtSecret)

	api := r.Group("/api/v1")
	music := api.Group("/music")
	music.Use(auth)
	{
		music.GET("/liked", h.ListLiked)
		music.POST("/liked", h.Like)
		music.DELETE("/liked/:source_id", h.Unlike)

		music.GET("/recent", h.ListRecent)
		music.POST("/recent", h.AddRecent)

		music.GET("/search-history", h.ListSearchHistory)
		music.GET("/search/tracks", h.SearchSpotifyTracks)
		music.GET("/search/artists", h.SearchSpotifyArtists)
		music.GET("/search/playlists", h.SearchSpotifyPlaylists)
		music.GET("/spotify/discovery/:section", h.GetSpotifyDiscovery)
		music.GET("/tracks/:track_id", h.GetSpotifyTrack)
		music.GET("/artists/:artist_id", h.GetSpotifyArtist)
		music.GET("/artists/:artist_id/discography", h.GetSpotifyArtistDiscography)
		music.GET("/albums/:album_id", h.GetSpotifyAlbum)
		music.GET("/albums/:album_id/tracks", h.GetSpotifyAlbumTracks)
		music.GET("/spotify/playlists/:playlist_id", h.GetSpotifyPlaylist)
		music.GET("/spotify/playlists/:playlist_id/tracks", h.GetSpotifyPlaylistTracks)
		music.GET("/browse/new-releases", h.GetSpotifyNewReleases)
		music.GET("/browse/featured-playlists", h.GetSpotifyFeaturedPlaylists)
		music.GET("/browse/categories", h.GetSpotifyCategories)
		music.GET("/browse/categories/:category_id/playlists", h.GetSpotifyCategoryPlaylists)
		music.GET("/recommendations", h.GetSpotifyRecommendations)
		music.POST("/search-history", h.AddSearchHistory)
		music.DELETE("/search-history", h.ClearSearchHistory)
		music.DELETE("/search-history/:id", h.DeleteSearchHistory)

		music.GET("/playlists", h.ListPlaylists)
		music.POST("/playlists", h.CreatePlaylist)
		music.DELETE("/playlists/:playlist_id", h.DeletePlaylist)
		music.POST("/playlists/:playlist_id/tracks", h.AddPlaylistTrack)

		music.GET("/library", h.ListLibrary)
		music.POST("/library", h.AddLibraryItem)
		music.DELETE("/library/:item_id", h.RemoveLibraryItem)

		music.POST("/events", h.TrackListeningEvent)
		music.GET("/events", h.ListListeningEvents)
		music.GET("/dna", h.GetUserDNA)

		music.POST("/ai/sessions", h.CreateAISession)
		music.GET("/ai/sessions/:session_id", h.GetAISession)
		music.POST("/ai/sessions/:session_id/candidates", h.AddAICandidates)
		music.POST("/ai/sessions/:session_id/messages", h.ChatWithMusic)
		music.POST("/smart-queue", h.BuildSmartQueue)
		music.POST("/radio", h.StartPersonalRadio)
		music.POST("/dynamic-playlist", h.CreateDynamicPlaylist)

		music.GET("/insights/journey", h.GetMusicJourney)
		music.GET("/insights/heatmap", h.GetListeningHeatmap)
		music.GET("/discover", h.DiscoverMusic)
		music.GET("/challenges", h.GetListeningChallenges)

		music.POST("/explain", h.ExplainMusic)
		music.POST("/compare", h.CompareMusic)
		music.POST("/album-review", h.ReviewAlbum)
		music.POST("/remix-discovery", h.DiscoverRemixes)

		music.POST("/sync/rooms", h.CreateSyncRoom)
		music.POST("/sync/rooms/join", h.JoinSyncRoom)
		music.POST("/sync/rooms/:room_id/recommendations", h.GetSyncRecommendations)
	}
}
