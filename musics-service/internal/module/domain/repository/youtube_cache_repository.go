package repository

import (
	"context"
	"time"

	"github.com/tumlumtala/musics-service/internal/module/domain/entity/youtube"
)

type YouTubeCacheRepository interface {
	GetYouTubeSearchCache(
		ctx context.Context,
		normalizedKeyword string,
		now time.Time,
		limit int,
	) ([]youtube.Track, bool, error)
	ReplaceYouTubeSearchCache(
		ctx context.Context,
		query youtube.SearchQuery,
		tracks []youtube.Track,
	) error
	GetCachedYouTubeVideo(
		ctx context.Context,
		videoID string,
		now time.Time,
	) (*youtube.Track, bool, error)
}
