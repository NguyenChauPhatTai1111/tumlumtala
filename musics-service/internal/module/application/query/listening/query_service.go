package listening

import (
	"context"

	evententity "github.com/tumlumtala/musics-service/internal/module/domain/entity/event"
	musicrepo "github.com/tumlumtala/musics-service/internal/module/domain/repository"
)

type QueryService struct {
	repo musicrepo.MusicRepository
}

func NewQueryService(repo musicrepo.MusicRepository) *QueryService {
	return &QueryService{repo: repo}
}

func (q *QueryService) RecentEvents(ctx context.Context, userUUID string, limit int) ([]evententity.ListeningEvent, error) {
	if limit <= 0 || limit > 500 {
		limit = 100
	}
	return q.repo.ListListeningEvents(ctx, userUUID, limit)
}

func (q *QueryService) DNA(ctx context.Context, userUUID string) ([]evententity.UserDNA, error) {
	return q.repo.GetUserDNA(ctx, userUUID)
}
