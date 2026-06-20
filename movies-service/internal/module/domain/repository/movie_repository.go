package repository

import (
	"context"

	certentity "github.com/tumlumtala/movies-service/internal/module/domain/entity/certification"
	likedentity "github.com/tumlumtala/movies-service/internal/module/domain/entity/liked"
	searchentity "github.com/tumlumtala/movies-service/internal/module/domain/entity/search"
	seasonentity "github.com/tumlumtala/movies-service/internal/module/domain/entity/season"
	watchentity "github.com/tumlumtala/movies-service/internal/module/domain/entity/watch"
)

// MovieReadRepository contains all read-only operations.
type MovieReadRepository interface {
	ListWatchHistoryPaged(ctx context.Context, userUUID string, page, limit int) ([]watchentity.WatchHistory, int64, error)
	GetWatchPosition(ctx context.Context, userUUID string, slug string, episodeSlug string) (*watchentity.WatchHistory, error)
	ListEpisodePositions(ctx context.Context, userUUID string, baseSlug string) ([]watchentity.WatchHistory, error)

	ListSearchHistory(ctx context.Context, userUUID string) ([]searchentity.SearchHistory, error)

	ListLikedMoviesPaged(ctx context.Context, userUUID string, page, limit int) ([]likedentity.MovieLiked, int64, error)

	GetCertificationsBySlugs(ctx context.Context, slugs []string) ([]certentity.MovieCertification, error)

	GetSeasons(ctx context.Context, baseSlug string) ([]seasonentity.MovieSeason, error)
	GetEpisodes(ctx context.Context, baseSlug string, seasonNumber int) ([]seasonentity.MovieEpisode, error)
}

// MovieWriteRepository contains all write (command) operations.
type MovieWriteRepository interface {
	AddWatchHistory(ctx context.Context, userUUID string, item watchentity.WatchHistory) (*watchentity.WatchHistory, error)
	DeleteWatchHistory(ctx context.Context, userUUID string, slug string) error
	BulkDeleteWatchHistory(ctx context.Context, userUUID string) error
	UpdateWatchPosition(ctx context.Context, userUUID string, slug string, episodeSlug string, position float64, duration float64, completed bool) error

	AddSearchHistory(ctx context.Context, userUUID string, keyword string) (*searchentity.SearchHistory, error)
	DeleteSearchHistory(ctx context.Context, userUUID string, id uint) error
	BulkDeleteSearchHistory(ctx context.Context, userUUID string) error

	LikeMovie(ctx context.Context, userUUID string, item likedentity.MovieLiked) (*likedentity.MovieLiked, error)
	UnlikeMovie(ctx context.Context, userUUID string, slug string) error

	UpsertCertification(ctx context.Context, item certentity.MovieCertification) error

	UpsertSeasons(ctx context.Context, seasons []seasonentity.MovieSeason) error
	UpsertEpisodes(ctx context.Context, episodes []seasonentity.MovieEpisode) error
}
