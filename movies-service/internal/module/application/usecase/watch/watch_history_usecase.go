package watch

import (
	"context"
	"time"

	"github.com/tumlumtala/movies-service/internal/module/application/dto"
	watchentity "github.com/tumlumtala/movies-service/internal/module/domain/entity/watch"
	movierepo "github.com/tumlumtala/movies-service/internal/module/domain/repository"
)

type WatchHistoryUseCase struct {
	repo movierepo.MovieWriteRepository
}

func NewWatchHistoryUseCase(repo movierepo.MovieWriteRepository) *WatchHistoryUseCase {
	return &WatchHistoryUseCase{repo: repo}
}

func (u *WatchHistoryUseCase) Add(ctx context.Context, userUUID string, req dto.AddWatchHistoryRequest) (*dto.WatchHistoryResponse, error) {
	item := watchentity.WatchHistory{
		UserUUID:            userUUID,
		Slug:                req.Slug,
		Name:                req.Name,
		OriginName:          req.OriginName,
		Thumbnail:           req.Thumbnail,
		PosterURL:           req.PosterURL,
		EpisodeName:         req.EpisodeName,
		EpisodeSlug:         req.EpisodeSlug,
		Type:                req.Type,
		Year:                req.Year,
		Quality:             req.Quality,
		Lang:                req.Lang,
		Rating:              req.Rating,
		WatchedAt:           time.Now(),
		LastWatchedPosition: req.LastWatchedPosition,
	}
	saved, err := u.repo.AddWatchHistory(ctx, userUUID, item)
	if err != nil {
		return nil, err
	}
	resp := dto.ToWatchHistoryResponse(*saved)
	return &resp, nil
}

func (u *WatchHistoryUseCase) Delete(ctx context.Context, userUUID string, slug string) error {
	return u.repo.DeleteWatchHistory(ctx, userUUID, slug)
}

func (u *WatchHistoryUseCase) BulkDelete(ctx context.Context, userUUID string) error {
	return u.repo.BulkDeleteWatchHistory(ctx, userUUID)
}

func (u *WatchHistoryUseCase) UpdatePosition(ctx context.Context, userUUID string, slug string, episodeSlug string, position float64, duration float64) error {
	completed := duration > 0 && position/duration >= 0.95
	savedPosition := position
	if completed {
		savedPosition = 0
	}
	return u.repo.UpdateWatchPosition(ctx, userUUID, slug, episodeSlug, savedPosition, duration, completed)
}
