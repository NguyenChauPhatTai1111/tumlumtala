package dto

import (
	"time"

	watchentity "github.com/tumlumtala/movies-service/internal/module/domain/entity/watch"
)

type AddWatchHistoryRequest struct {
	Slug                string  `json:"slug" binding:"required"`
	Name                string  `json:"name" binding:"required"`
	OriginName          string  `json:"origin_name"`
	Thumbnail           string  `json:"thumbnail"`
	PosterURL           string  `json:"poster_url"`
	EpisodeName         string  `json:"episode_name"`
	EpisodeSlug         string  `json:"episode_slug"`
	Type                string  `json:"type"`
	Year                int     `json:"year"`
	Quality             string  `json:"quality"`
	Lang                string  `json:"lang"`
	Rating              string  `json:"rating"`
	LastWatchedPosition float64 `json:"last_watched_position"`
}

type UpdateWatchPositionRequest struct {
	Position float64 `json:"position" binding:"required,min=0"`
	Duration float64 `json:"duration"`
}

type WatchHistoryResponse struct {
	ID                  uint       `json:"id"`
	Slug                string     `json:"slug"`
	Name                string     `json:"name"`
	OriginName          string     `json:"origin_name"`
	Thumbnail           string     `json:"thumbnail"`
	PosterURL           string     `json:"poster_url"`
	EpisodeName         string     `json:"episode_name"`
	EpisodeSlug         string     `json:"episode_slug"`
	Type                string     `json:"type"`
	Year                int        `json:"year"`
	Quality             string     `json:"quality"`
	Lang                string     `json:"lang"`
	Rating              string     `json:"rating"`
	WatchedAt           time.Time  `json:"watched_at"`
	LastWatchedPosition float64    `json:"last_watched_position"`
	Duration            float64    `json:"duration"`
	Completed           bool       `json:"completed"`
	DeletedAt           *time.Time `json:"deleted_at"`
}

type EpisodePositionResponse struct {
	Slug                string  `json:"slug"`
	EpisodeSlug         string  `json:"episode_slug"`
	LastWatchedPosition float64 `json:"last_watched_position"`
	Duration            float64 `json:"duration"`
}

func ToWatchHistoryResponse(item watchentity.WatchHistory) WatchHistoryResponse {
	return WatchHistoryResponse{
		ID:                  item.ID,
		Slug:                item.Slug,
		Name:                item.Name,
		OriginName:          item.OriginName,
		Thumbnail:           item.Thumbnail,
		PosterURL:           item.PosterURL,
		EpisodeName:         item.EpisodeName,
		EpisodeSlug:         item.EpisodeSlug,
		Type:                item.Type,
		Year:                item.Year,
		Quality:             item.Quality,
		Lang:                item.Lang,
		Rating:              item.Rating,
		WatchedAt:           item.WatchedAt,
		LastWatchedPosition: item.LastWatchedPosition,
		Duration:            item.Duration,
		Completed:           item.Completed,
		DeletedAt:           item.DeletedAt,
	}
}

func ToWatchHistoryResponses(items []watchentity.WatchHistory) []WatchHistoryResponse {
	result := make([]WatchHistoryResponse, 0, len(items))
	for _, item := range items {
		result = append(result, ToWatchHistoryResponse(item))
	}
	return result
}
