package repository

import (
	"context"
	"errors"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"github.com/tumlumtala/musics-service/internal/module/domain/entity/youtube"
)

func (r *Repository) GetYouTubeSearchCache(
	ctx context.Context,
	normalizedKeyword string,
	now time.Time,
	limit int,
) ([]youtube.Track, bool, error) {
	var query youtube.SearchQuery
	err := r.db.WithContext(ctx).
		Where("normalized_keyword = ? AND expires_at > ?", normalizedKeyword, now).
		First(&query).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, false, nil
	}
	if err != nil {
		return nil, false, err
	}
	if query.ResultCount == 0 {
		return []youtube.Track{}, true, nil
	}

	var tracks []youtube.Track
	db := r.db.WithContext(ctx).
		Where("search_query_id = ?", query.ID).
		Order("position ASC, id ASC")
	if limit > 0 {
		db = db.Limit(limit)
	}
	if err := db.Find(&tracks).Error; err != nil {
		return nil, false, err
	}
	if len(tracks) == 0 {
		return nil, false, nil
	}
	return tracks, true, nil
}

func (r *Repository) ReplaceYouTubeSearchCache(
	ctx context.Context,
	query youtube.SearchQuery,
	tracks []youtube.Track,
) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Clauses(clause.OnConflict{
			Columns: []clause.Column{{Name: "normalized_keyword"}},
			DoUpdates: clause.AssignmentColumns([]string{
				"keyword", "result_count", "cached_at", "expires_at",
			}),
		}).Create(&query).Error; err != nil {
			return err
		}
		if err := tx.
			Where("normalized_keyword = ?", query.NormalizedKeyword).
			First(&query).Error; err != nil {
			return err
		}
		if err := tx.
			Where("search_query_id = ?", query.ID).
			Delete(&youtube.Track{}).Error; err != nil {
			return err
		}
		if len(tracks) == 0 {
			return nil
		}
		for index := range tracks {
			tracks[index].SearchQueryID = query.ID
			tracks[index].Keyword = query.Keyword
			tracks[index].CachedAt = query.CachedAt
			tracks[index].Position = uint32(index)
		}
		return tx.Create(&tracks).Error
	})
}

func (r *Repository) GetCachedYouTubeVideo(
	ctx context.Context,
	videoID string,
	now time.Time,
) (*youtube.Track, bool, error) {
	var track youtube.Track
	err := r.db.WithContext(ctx).
		Table("youtube_tracks AS tracks").
		Select("tracks.*").
		Joins(
			"JOIN youtube_search_queries AS queries ON queries.id = tracks.search_query_id",
		).
		Where("tracks.video_id = ? AND queries.expires_at > ?", videoID, now).
		Order("tracks.cached_at DESC").
		First(&track).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, false, nil
	}
	if err != nil {
		return nil, false, err
	}
	return &track, true, nil
}
