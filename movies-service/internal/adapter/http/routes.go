package http

import (
	"github.com/gin-gonic/gin"

	"github.com/tumlumtala/movies-service/internal/middleware"
)

func RegisterRoutes(r *gin.Engine, h *Handler, jwtSecret string) {
	auth := middleware.AuthMiddleware(jwtSecret)

	api := r.Group("/api/v1")

	// Public endpoints
	api.POST("/movie/certifications/batch", h.BatchCertifications)
	api.GET("/movie/seasons/:base_slug", h.GetSeasons)
	api.GET("/movie/seasons/:base_slug/episodes", h.GetEpisodes)

	// Authenticated endpoints
	protected := api.Group("/movie")
	protected.Use(auth)
	{
		protected.GET("/history", h.ListWatchHistory)
		protected.POST("/history", h.AddWatchHistory)
		protected.DELETE("/history", h.DeleteWatchHistoryAll)
		protected.DELETE("/history/:slug", h.DeleteWatchHistory)
		protected.GET("/history/:slug/position", h.GetWatchPosition)
		protected.GET("/history/:slug/positions", h.ListEpisodePositions)
		protected.PATCH("/history/:slug/position", h.UpdateWatchPosition)

		protected.GET("/search-history", h.ListSearchHistory)
		protected.POST("/search-history", h.AddSearchHistory)
		protected.DELETE("/search-history", h.DeleteSearchHistoryAll)
		protected.DELETE("/search-history/:id", h.DeleteSearchHistoryOne)

		protected.GET("/liked", h.ListLikedMovies)
		protected.POST("/liked", h.LikeMovie)
		protected.DELETE("/liked/:slug", h.UnlikeMovie)

		protected.POST("/seasons/:base_slug", h.UpsertSeasons)
		protected.POST("/seasons/:base_slug/episodes", h.UpsertEpisodes)
	}
}
