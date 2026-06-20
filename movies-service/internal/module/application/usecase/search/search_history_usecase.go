package search

import (
	"context"

	"github.com/tumlumtala/movies-service/internal/module/application/dto"
	movierepo "github.com/tumlumtala/movies-service/internal/module/domain/repository"
)

type SearchHistoryUseCase struct {
	repo movierepo.MovieWriteRepository
}

func NewSearchHistoryUseCase(repo movierepo.MovieWriteRepository) *SearchHistoryUseCase {
	return &SearchHistoryUseCase{repo: repo}
}

func (u *SearchHistoryUseCase) Add(ctx context.Context, userUUID string, keyword string) (*dto.SearchHistoryResponse, error) {
	item, err := u.repo.AddSearchHistory(ctx, userUUID, keyword)
	if err != nil {
		return nil, err
	}
	resp := dto.ToSearchHistoryResponse(*item)
	return &resp, nil
}

func (u *SearchHistoryUseCase) Delete(ctx context.Context, userUUID string, id uint) error {
	return u.repo.DeleteSearchHistory(ctx, userUUID, id)
}

func (u *SearchHistoryUseCase) BulkDelete(ctx context.Context, userUUID string) error {
	return u.repo.BulkDeleteSearchHistory(ctx, userUUID)
}
