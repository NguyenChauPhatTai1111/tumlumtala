package history

import (
	"context"

	mediadto "github.com/tumlumtala/musics-service/internal/module/application/dto/media"
	mediauc "github.com/tumlumtala/musics-service/internal/module/application/usecase/media"
	"github.com/tumlumtala/musics-service/internal/module/domain/entity/history"
	musicrepo "github.com/tumlumtala/musics-service/internal/module/domain/repository"
)

type UseCase struct {
	repo musicrepo.MusicRepository
}

func NewUseCase(repo musicrepo.MusicRepository) *UseCase {
	return &UseCase{repo: repo}
}

func (u *UseCase) Add(ctx context.Context, userUUID string, req mediadto.MediaItemRequest) (*history.RecentTrack, error) {
	return u.repo.AddRecent(ctx, userUUID, mediauc.FromRequest(userUUID, req))
}
