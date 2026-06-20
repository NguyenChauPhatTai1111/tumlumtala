package watch

import (
	"context"

	"github.com/tumlumtala/movies-service/internal/module/application/dto"
	movierepo "github.com/tumlumtala/movies-service/internal/module/domain/repository"
)

type WatchHistoryQueryUseCase struct {
	repo movierepo.MovieReadRepository
}

func NewWatchHistoryQueryUseCase(repo movierepo.MovieReadRepository) *WatchHistoryQueryUseCase {
	return &WatchHistoryQueryUseCase{repo: repo}
}

func (uc *WatchHistoryQueryUseCase) ListPaged(ctx context.Context, userUUID string, page, limit int) ([]dto.WatchHistoryResponse, int64, error) {
	items, total, err := uc.repo.ListWatchHistoryPaged(ctx, userUUID, page, limit)
	if err != nil {
		return nil, 0, err
	}
	return dto.ToWatchHistoryResponses(items), total, nil
}

func (uc *WatchHistoryQueryUseCase) GetPosition(ctx context.Context, userUUID string, slug string, episodeSlug string) (*dto.WatchHistoryResponse, error) {
	item, err := uc.repo.GetWatchPosition(ctx, userUUID, slug, episodeSlug)
	if err != nil {
		return nil, err
	}
	if item == nil {
		return nil, nil
	}
	resp := dto.ToWatchHistoryResponse(*item)
	return &resp, nil
}

func (uc *WatchHistoryQueryUseCase) ListEpisodePositions(ctx context.Context, userUUID string, baseSlug string) ([]dto.EpisodePositionResponse, error) {
	items, err := uc.repo.ListEpisodePositions(ctx, userUUID, baseSlug)
	if err != nil {
		return nil, err
	}
	result := make([]dto.EpisodePositionResponse, 0, len(items))
	for _, item := range items {
		result = append(result, dto.EpisodePositionResponse{
			Slug:                item.Slug,
			EpisodeSlug:         item.EpisodeSlug,
			LastWatchedPosition: item.LastWatchedPosition,
			Duration:            item.Duration,
		})
	}
	return result, nil
}
