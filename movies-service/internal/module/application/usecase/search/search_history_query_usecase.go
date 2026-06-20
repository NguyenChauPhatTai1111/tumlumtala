package search

import (
	"context"

	"github.com/tumlumtala/movies-service/internal/module/application/dto"
	movierepo "github.com/tumlumtala/movies-service/internal/module/domain/repository"
)

type SearchHistoryQueryUseCase struct {
	repo movierepo.MovieReadRepository
}

func NewSearchHistoryQueryUseCase(repo movierepo.MovieReadRepository) *SearchHistoryQueryUseCase {
	return &SearchHistoryQueryUseCase{repo: repo}
}

func (uc *SearchHistoryQueryUseCase) List(ctx context.Context, userUUID string) ([]dto.SearchHistoryResponse, error) {
	items, err := uc.repo.ListSearchHistory(ctx, userUUID)
	if err != nil {
		return nil, err
	}
	return dto.ToSearchHistoryResponses(items), nil
}
