package history

import (
	"context"

	"github.com/tumlumtala/musics-service/internal/module/domain/entity/history"
	musicrepo "github.com/tumlumtala/musics-service/internal/module/domain/repository"
)

type QueryService struct {
	repo musicrepo.MusicRepository
}

func NewQueryService(repo musicrepo.MusicRepository) *QueryService {
	return &QueryService{repo: repo}
}

func (q *QueryService) List(ctx context.Context, userUUID string) ([]history.RecentTrack, error) {
	return q.repo.ListRecent(ctx, userUUID)
}
