package search

import (
	"context"
	"strings"

	"github.com/tumlumtala/musics-service/internal/module/domain/entity/search"
	musicrepo "github.com/tumlumtala/musics-service/internal/module/domain/repository"
)

type UseCase struct {
	repo musicrepo.MusicRepository
}

func NewUseCase(repo musicrepo.MusicRepository) *UseCase {
	return &UseCase{repo: repo}
}

func (u *UseCase) Add(ctx context.Context, userUUID, keyword string) (*search.SearchHistory, error) {
	return u.repo.AddSearchHistory(ctx, userUUID, strings.TrimSpace(keyword))
}

func (u *UseCase) Delete(ctx context.Context, userUUID string, id uint64) error {
	return u.repo.DeleteSearchHistory(ctx, userUUID, id)
}

func (u *UseCase) Clear(ctx context.Context, userUUID string) error {
	return u.repo.ClearSearchHistory(ctx, userUUID)
}
