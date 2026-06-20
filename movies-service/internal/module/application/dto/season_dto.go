package dto

import seasonentity "github.com/tumlumtala/movies-service/internal/module/domain/entity/season"

type SeasonResponse struct {
	ID           uint   `json:"id"`
	BaseSlug     string `json:"base_slug"`
	SeasonNumber int    `json:"season_number"`
	SeasonSlug   string `json:"season_slug"`
	Name         string `json:"name"`
}

type EpisodeResponse struct {
	ID           uint   `json:"id"`
	BaseSlug     string `json:"base_slug"`
	SeasonNumber int    `json:"season_number"`
	ServerName   string `json:"server_name"`
	EpisodeName  string `json:"episode_name"`
	EpisodeSlug  string `json:"episode_slug"`
	Overview     string `json:"overview"`
	StillPath    string `json:"still_path"`
	Filename     string `json:"filename"`
	LinkEmbed    string `json:"link_embed"`
	LinkM3U8     string `json:"link_m3u8"`
}

type UpsertSeasonsRequest struct {
	Seasons []SeasonInput `json:"seasons" binding:"required,min=1"`
}

type SeasonInput struct {
	SeasonNumber int    `json:"season_number" binding:"required,min=1"`
	SeasonSlug   string `json:"season_slug" binding:"required"`
	Name         string `json:"name"`
}

type UpsertEpisodesRequest struct {
	SeasonNumber int            `json:"season_number" binding:"required,min=1"`
	Episodes     []EpisodeInput `json:"episodes" binding:"required,min=1"`
}

type EpisodeInput struct {
	ServerName  string `json:"server_name" binding:"required"`
	EpisodeName string `json:"episode_name"`
	EpisodeSlug string `json:"episode_slug" binding:"required"`
	Overview    string `json:"overview"`
	StillPath   string `json:"still_path"`
	Filename    string `json:"filename"`
	LinkEmbed   string `json:"link_embed"`
	LinkM3U8    string `json:"link_m3u8"`
}

func ToSeasonResponse(s seasonentity.MovieSeason) SeasonResponse {
	return SeasonResponse{
		ID:           s.ID,
		BaseSlug:     s.BaseSlug,
		SeasonNumber: s.SeasonNumber,
		SeasonSlug:   s.SeasonSlug,
		Name:         s.Name,
	}
}

func ToEpisodeResponse(e seasonentity.MovieEpisode) EpisodeResponse {
	return EpisodeResponse{
		ID:           e.ID,
		BaseSlug:     e.BaseSlug,
		SeasonNumber: e.SeasonNumber,
		ServerName:   e.ServerName,
		EpisodeName:  e.EpisodeName,
		EpisodeSlug:  e.EpisodeSlug,
		Overview:     e.Overview,
		StillPath:    e.StillPath,
		Filename:     e.Filename,
		LinkEmbed:    e.LinkEmbed,
		LinkM3U8:     e.LinkM3u8,
	}
}
