package dto

import (
	"time"

	likedentity "github.com/tumlumtala/movies-service/internal/module/domain/entity/liked"
)

type LikeMovieRequest struct {
	Slug       string `json:"slug" binding:"required"`
	Name       string `json:"name" binding:"required"`
	OriginName string `json:"origin_name"`
	Thumbnail  string `json:"thumbnail"`
	PosterURL  string `json:"poster_url"`
	Type       string `json:"type"`
	Year       int    `json:"year"`
	Quality    string `json:"quality"`
	Lang       string `json:"lang"`
	Rating     string `json:"rating"`
}

type LikedMovieResponse struct {
	ID         uint      `json:"id"`
	Slug       string    `json:"slug"`
	Name       string    `json:"name"`
	OriginName string    `json:"origin_name"`
	Thumbnail  string    `json:"thumbnail"`
	PosterURL  string    `json:"poster_url"`
	Type       string    `json:"type"`
	Year       int       `json:"year"`
	Quality    string    `json:"quality"`
	Lang       string    `json:"lang"`
	Rating     string    `json:"rating"`
	LikedAt    time.Time `json:"liked_at"`
}

func ToLikedMovieResponse(item likedentity.MovieLiked) LikedMovieResponse {
	return LikedMovieResponse{
		ID:         item.ID,
		Slug:       item.Slug,
		Name:       item.Name,
		OriginName: item.OriginName,
		Thumbnail:  item.Thumbnail,
		PosterURL:  item.PosterURL,
		Type:       item.Type,
		Year:       item.Year,
		Quality:    item.Quality,
		Lang:       item.Lang,
		Rating:     item.Rating,
		LikedAt:    item.LikedAt,
	}
}

func ToLikedMovieResponses(items []likedentity.MovieLiked) []LikedMovieResponse {
	result := make([]LikedMovieResponse, 0, len(items))
	for _, item := range items {
		result = append(result, ToLikedMovieResponse(item))
	}
	return result
}
