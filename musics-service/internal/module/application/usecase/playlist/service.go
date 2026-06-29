package playlist

import (
	"context"
	"strings"

	playlistdto "github.com/tumlumtala/musics-service/internal/module/application/dto/playlist"
	mediauc "github.com/tumlumtala/musics-service/internal/module/application/usecase/media"
	"github.com/tumlumtala/musics-service/internal/module/domain/entity/playlist"
	musicrepo "github.com/tumlumtala/musics-service/internal/module/domain/repository"
)

type UseCase struct {
	repo musicrepo.MusicRepository
}

func NewUseCase(repo musicrepo.MusicRepository) *UseCase {
	return &UseCase{repo: repo}
}

func (u *UseCase) Create(ctx context.Context, userUUID string, req playlistdto.CreatePlaylistRequest) (*playlist.Playlist, error) {
	return u.repo.CreatePlaylist(ctx, playlist.Playlist{
		UserUUID:    userUUID,
		Name:        strings.TrimSpace(req.Name),
		Cover:       strings.TrimSpace(req.Cover),
		Description: strings.TrimSpace(req.Description),
	})
}

func (u *UseCase) AddTrack(ctx context.Context, userUUID string, playlistID uint64, req playlistdto.AddPlaylistTrackRequest) (*playlist.PlaylistTrack, error) {
	return u.repo.AddPlaylistTrack(ctx, userUUID, playlistID, mediauc.FromRequest(userUUID, req.MediaItem), req.Position)
}

func (u *UseCase) Delete(ctx context.Context, userUUID string, playlistID uint64) error {
	return u.repo.DeletePlaylist(ctx, userUUID, playlistID)
}
