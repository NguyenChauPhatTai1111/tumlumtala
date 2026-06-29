package library

import (
	"context"
	"strings"

	librarydto "github.com/tumlumtala/musics-service/internal/module/application/dto/library"
	"github.com/tumlumtala/musics-service/internal/module/domain/entity/library"
	musicrepo "github.com/tumlumtala/musics-service/internal/module/domain/repository"
)

type UseCase struct {
	repo musicrepo.MusicRepository
}

func NewUseCase(repo musicrepo.MusicRepository) *UseCase {
	return &UseCase{repo: repo}
}

func (u *UseCase) Add(ctx context.Context, userUUID string, req librarydto.AddItemRequest) (*library.Item, error) {
	metadata := strings.TrimSpace(string(req.Metadata))
	if metadata == "" || metadata == "null" {
		metadata = "{}"
	}
	return u.repo.AddLibraryItem(ctx, library.Item{
		UserUUID:  userUUID,
		ItemType:  strings.TrimSpace(req.ItemType),
		SourceID:  strings.TrimSpace(req.SourceID),
		Title:     strings.TrimSpace(req.Title),
		Subtitle:  strings.TrimSpace(req.Subtitle),
		Thumbnail: strings.TrimSpace(req.Thumbnail),
		Metadata:  metadata,
	})
}

func (u *UseCase) Remove(ctx context.Context, userUUID string, itemID uint64) error {
	return u.repo.RemoveLibraryItem(ctx, userUUID, itemID)
}
