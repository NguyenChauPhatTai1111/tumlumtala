package playlist

import (
	"context"

	"github.com/tumlumtala/musics-service/internal/module/domain/entity/playlist"
	musicrepo "github.com/tumlumtala/musics-service/internal/module/domain/repository"
)

type QueryService struct {
	repo musicrepo.MusicRepository
}

func NewQueryService(repo musicrepo.MusicRepository) *QueryService {
	return &QueryService{repo: repo}
}

func (q *QueryService) List(ctx context.Context, userUUID string) ([]playlist.Playlist, error) {
	return q.repo.ListPlaylists(ctx, userUUID)
}
