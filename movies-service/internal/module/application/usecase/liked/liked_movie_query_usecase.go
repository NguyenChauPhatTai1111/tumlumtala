package liked

import (
	"context"

	"github.com/tumlumtala/movies-service/internal/module/application/dto"
	movierepo "github.com/tumlumtala/movies-service/internal/module/domain/repository"
)

type LikedMovieQueryUseCase struct {
	repo movierepo.MovieReadRepository
}

func NewLikedMovieQueryUseCase(repo movierepo.MovieReadRepository) *LikedMovieQueryUseCase {
	return &LikedMovieQueryUseCase{repo: repo}
}

func (uc *LikedMovieQueryUseCase) ListPaged(ctx context.Context, userUUID string, page, limit int) ([]dto.LikedMovieResponse, int64, error) {
	items, total, err := uc.repo.ListLikedMoviesPaged(ctx, userUUID, page, limit)
	if err != nil {
		return nil, 0, err
	}
	return dto.ToLikedMovieResponses(items), total, nil
}
