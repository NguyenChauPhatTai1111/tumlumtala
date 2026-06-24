package liked

import (
	"context"

	mediadto "github.com/tumlumtala/musics-service/internal/module/application/dto/media"
	mediauc "github.com/tumlumtala/musics-service/internal/module/application/usecase/media"
	"github.com/tumlumtala/musics-service/internal/module/domain/entity/liked"
	musicrepo "github.com/tumlumtala/musics-service/internal/module/domain/repository"
)

type UseCase struct {
	repo musicrepo.MusicRepository
}

func NewUseCase(repo musicrepo.MusicRepository) *UseCase {
	return &UseCase{repo: repo}
}

func (u *UseCase) Like(ctx context.Context, userUUID string, req mediadto.MediaItemRequest) (*liked.LikedTrack, error) {
	return u.repo.Like(ctx, userUUID, mediauc.FromRequest(userUUID, req))
}

func (u *UseCase) Unlike(ctx context.Context, userUUID, sourceID, mediaType string) error {
	return u.repo.Unlike(ctx, userUUID, sourceID, mediaType)
}
