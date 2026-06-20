package season

import (
	"context"

	"github.com/tumlumtala/movies-service/internal/module/application/dto"
	seasonentity "github.com/tumlumtala/movies-service/internal/module/domain/entity/season"
	movierepo "github.com/tumlumtala/movies-service/internal/module/domain/repository"
)

type SeasonUseCase struct {
	repo movierepo.MovieWriteRepository
}

func NewSeasonUseCase(repo movierepo.MovieWriteRepository) *SeasonUseCase {
	return &SeasonUseCase{repo: repo}
}

func (u *SeasonUseCase) UpsertSeasons(ctx context.Context, baseSlug string, req dto.UpsertSeasonsRequest) error {
	entities := make([]seasonentity.MovieSeason, 0, len(req.Seasons))
	for _, s := range req.Seasons {
		entities = append(entities, seasonentity.MovieSeason{
			BaseSlug:     baseSlug,
			SeasonNumber: s.SeasonNumber,
			SeasonSlug:   s.SeasonSlug,
			Name:         s.Name,
		})
	}
	return u.repo.UpsertSeasons(ctx, entities)
}

func (u *SeasonUseCase) UpsertEpisodes(ctx context.Context, baseSlug string, req dto.UpsertEpisodesRequest) error {
	entities := make([]seasonentity.MovieEpisode, 0, len(req.Episodes))
	for _, e := range req.Episodes {
		entities = append(entities, seasonentity.MovieEpisode{
			BaseSlug:     baseSlug,
			SeasonNumber: req.SeasonNumber,
			ServerName:   e.ServerName,
			EpisodeName:  e.EpisodeName,
			EpisodeSlug:  e.EpisodeSlug,
			Overview:     e.Overview,
			StillPath:    e.StillPath,
			Filename:     e.Filename,
			LinkEmbed:    e.LinkEmbed,
			LinkM3u8:     e.LinkM3U8,
		})
	}
	return u.repo.UpsertEpisodes(ctx, entities)
}
