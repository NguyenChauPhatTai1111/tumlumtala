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
		music.POST("/search-history", h.AddSearchHistory)

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
	}
}
