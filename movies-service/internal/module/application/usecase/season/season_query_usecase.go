package season

import (
	"context"

	"github.com/tumlumtala/movies-service/internal/module/application/dto"
	movierepo "github.com/tumlumtala/movies-service/internal/module/domain/repository"
)

type SeasonQueryUseCase struct {
	repo movierepo.MovieReadRepository
}

func NewSeasonQueryUseCase(repo movierepo.MovieReadRepository) *SeasonQueryUseCase {
	return &SeasonQueryUseCase{repo: repo}
}

func (uc *SeasonQueryUseCase) GetSeasons(ctx context.Context, baseSlug string) ([]dto.SeasonResponse, error) {
	rows, err := uc.repo.GetSeasons(ctx, baseSlug)
	if err != nil {
		return nil, err
	}
	out := make([]dto.SeasonResponse, 0, len(rows))
	for _, r := range rows {
		out = append(out, dto.ToSeasonResponse(r))
	}
	return out, nil
}

func (uc *SeasonQueryUseCase) GetEpisodes(ctx context.Context, baseSlug string, seasonNumber int) ([]dto.EpisodeResponse, error) {
	rows, err := uc.repo.GetEpisodes(ctx, baseSlug, seasonNumber)
	if err != nil {
		return nil, err
	}
	out := make([]dto.EpisodeResponse, 0, len(rows))
	for _, r := range rows {
		out = append(out, dto.ToEpisodeResponse(r))
	}
	return out, nil
}
