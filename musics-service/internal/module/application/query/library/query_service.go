package library

import (
	"context"

	"github.com/tumlumtala/musics-service/internal/module/domain/entity/library"
	musicrepo "github.com/tumlumtala/musics-service/internal/module/domain/repository"
)

type QueryService struct {
	repo musicrepo.MusicRepository
}

func NewQueryService(repo musicrepo.MusicRepository) *QueryService {
	return &QueryService{repo: repo}
}

func (q *QueryService) List(ctx context.Context, userUUID string) ([]library.Item, error) {
	return q.repo.ListLibraryItems(ctx, userUUID)
}
