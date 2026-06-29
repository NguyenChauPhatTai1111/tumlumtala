package repository

import (
	"context"

	"github.com/tumlumtala/musics-service/internal/module/domain/entity/event"
	"github.com/tumlumtala/musics-service/internal/module/domain/entity/history"
	"github.com/tumlumtala/musics-service/internal/module/domain/entity/library"
	"github.com/tumlumtala/musics-service/internal/module/domain/entity/liked"
	"github.com/tumlumtala/musics-service/internal/module/domain/entity/media"
	"github.com/tumlumtala/musics-service/internal/module/domain/entity/playlist"
	"github.com/tumlumtala/musics-service/internal/module/domain/entity/search"
)

type MusicRepository interface {
	UpsertMediaItem(ctx context.Context, item media.MediaItem) (*media.MediaItem, error)
	Like(ctx context.Context, userUUID string, item media.MediaItem) (*liked.LikedTrack, error)
	Unlike(ctx context.Context, userUUID, sourceID, mediaType string) error
	ListLiked(ctx context.Context, userUUID string) ([]liked.LikedTrack, error)
	AddRecent(ctx context.Context, userUUID string, item media.MediaItem) (*history.RecentTrack, error)
	ListRecent(ctx context.Context, userUUID string) ([]history.RecentTrack, error)
	AddSearchHistory(ctx context.Context, userUUID, keyword string) (*search.SearchHistory, error)
	ListSearchHistory(ctx context.Context, userUUID string) ([]search.SearchHistory, error)
	CreatePlaylist(ctx context.Context, p playlist.Playlist) (*playlist.Playlist, error)
	ListPlaylists(ctx context.Context, userUUID string) ([]playlist.Playlist, error)
	DeletePlaylist(ctx context.Context, userUUID string, playlistID uint64) error
	AddPlaylistTrack(ctx context.Context, userUUID string, playlistID uint64, item media.MediaItem, position int) (*playlist.PlaylistTrack, error)
	ListLibraryItems(ctx context.Context, userUUID string) ([]library.Item, error)
	AddLibraryItem(ctx context.Context, item library.Item) (*library.Item, error)
	RemoveLibraryItem(ctx context.Context, userUUID string, itemID uint64) error
	AddListeningEvent(ctx context.Context, e event.ListeningEvent) (*event.ListeningEvent, error)
	ListListeningEvents(ctx context.Context, userUUID string, limit int) ([]event.ListeningEvent, error)
	GetUserDNA(ctx context.Context, userUUID string) ([]event.UserDNA, error)
	UpsertUserDNA(ctx context.Context, dna event.UserDNA) error
}
