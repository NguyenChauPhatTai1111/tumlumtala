package repository

import (
	"context"
	"errors"
	"strings"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	certentity "github.com/tumlumtala/movies-service/internal/module/domain/entity/certification"
	likedentity "github.com/tumlumtala/movies-service/internal/module/domain/entity/liked"
	searchentity "github.com/tumlumtala/movies-service/internal/module/domain/entity/search"
	seasonentity "github.com/tumlumtala/movies-service/internal/module/domain/entity/season"
	watchentity "github.com/tumlumtala/movies-service/internal/module/domain/entity/watch"
)

type Repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) AddWatchHistory(ctx context.Context, userUUID string, item watchentity.WatchHistory) (*watchentity.WatchHistory, error) {
	now := time.Now()
	var existing watchentity.WatchHistory
	err := r.db.WithContext(ctx).
		Where("user_uuid = ? AND slug = ? AND episode_slug = ?", userUUID, item.Slug, item.EpisodeSlug).
		First(&existing).Error

	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	if errors.Is(err, gorm.ErrRecordNotFound) {
		item.UserUUID = userUUID
		item.WatchedAt = now
		if err := r.db.WithContext(ctx).Create(&item).Error; err != nil {
			return nil, err
		}
		return &item, nil
	}

	updates := map[string]any{
		"name":         item.Name,
		"origin_name":  item.OriginName,
		"thumbnail":    item.Thumbnail,
		"poster_url":   item.PosterURL,
		"episode_name": item.EpisodeName,
		"type":         item.Type,
		"year":         item.Year,
		"quality":      item.Quality,
		"lang":         item.Lang,
		"watched_at":   now,
		"deleted_at":   nil,
	}
	if err := r.db.WithContext(ctx).Model(&existing).Updates(updates).Error; err != nil {
		return nil, err
	}
	existing.WatchedAt = now
	return &existing, nil
}

func (r *Repository) UpdateWatchPosition(ctx context.Context, userUUID string, slug string, episodeSlug string, position float64, duration float64, completed bool) error {
	updates := map[string]any{
		"last_watched_position": position,
		"duration":              duration,
		"completed":             completed,
		"watched_at":            time.Now(),
	}
	return r.db.WithContext(ctx).Model(&watchentity.WatchHistory{}).
		Where("user_uuid = ? AND slug = ? AND episode_slug = ?", userUUID, slug, episodeSlug).
		Updates(updates).Error
}

func (r *Repository) GetWatchPosition(ctx context.Context, userUUID string, slug string, episodeSlug string) (*watchentity.WatchHistory, error) {
	var row watchentity.WatchHistory
	err := r.db.WithContext(ctx).
		Where("user_uuid = ? AND slug = ? AND episode_slug = ?", userUUID, slug, episodeSlug).
		First(&row).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &row, err
}

func (r *Repository) ListEpisodePositions(ctx context.Context, userUUID string, baseSlug string) ([]watchentity.WatchHistory, error) {
	var rows []watchentity.WatchHistory
	err := r.db.WithContext(ctx).
		Where("user_uuid = ? AND (slug = ? OR slug LIKE ?) AND deleted_at IS NULL AND last_watched_position > 0",
			userUUID, baseSlug, baseSlug+"-%").
		Order("watched_at DESC").
		Find(&rows).Error
	return rows, err
}

func (r *Repository) DeleteWatchHistory(ctx context.Context, userUUID string, slug string) error {
	return r.db.WithContext(ctx).Model(&watchentity.WatchHistory{}).
		Where("user_uuid = ? AND slug = ?", userUUID, slug).
		Update("deleted_at", time.Now()).Error
}

func (r *Repository) BulkDeleteWatchHistory(ctx context.Context, userUUID string) error {
	return r.db.WithContext(ctx).Model(&watchentity.WatchHistory{}).
		Where("user_uuid = ? AND deleted_at IS NULL", userUUID).
		Update("deleted_at", time.Now()).Error
}

func (r *Repository) ListWatchHistoryPaged(ctx context.Context, userUUID string, page, limit int) ([]watchentity.WatchHistory, int64, error) {
	latestPerSlug := "deleted_at IS NULL AND watched_at = (SELECT MAX(w2.watched_at) FROM movie_watch_history w2 WHERE w2.user_uuid = movie_watch_history.user_uuid AND w2.slug = movie_watch_history.slug AND w2.deleted_at IS NULL)"
	var total int64
	if err := r.db.WithContext(ctx).Model(&watchentity.WatchHistory{}).
		Where("user_uuid = ? AND "+latestPerSlug, userUUID).
		Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var rows []watchentity.WatchHistory
	offset := (page - 1) * limit
	err := r.db.WithContext(ctx).
		Where("user_uuid = ? AND "+latestPerSlug, userUUID).
		Order("watched_at DESC").
		Limit(limit).Offset(offset).
		Find(&rows).Error
	return rows, total, err
}

func (r *Repository) AddSearchHistory(ctx context.Context, userUUID string, keyword string) (*searchentity.SearchHistory, error) {
	keyword = strings.TrimSpace(keyword)
	now := time.Now()
	var row searchentity.SearchHistory
	err := r.db.WithContext(ctx).
		Where("user_uuid = ? AND LOWER(keyword) = LOWER(?)", userUUID, keyword).
		First(&row).Error
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}
	if errors.Is(err, gorm.ErrRecordNotFound) {
		row = searchentity.SearchHistory{UserUUID: userUUID, Keyword: keyword, CreatedAt: now, UpdatedAt: now}
		if err := r.db.WithContext(ctx).Create(&row).Error; err != nil {
			return nil, err
		}
		return &row, nil
	}
	if err := r.db.WithContext(ctx).Model(&row).Update("updated_at", now).Error; err != nil {
		return nil, err
	}
	row.UpdatedAt = now
	return &row, nil
}

func (r *Repository) ListSearchHistory(ctx context.Context, userUUID string) ([]searchentity.SearchHistory, error) {
	var rows []searchentity.SearchHistory
	err := r.db.WithContext(ctx).
		Where("user_uuid = ?", userUUID).
		Order("updated_at DESC, created_at DESC, id DESC").
		Limit(30).Find(&rows).Error
	return rows, err
}

func (r *Repository) DeleteSearchHistory(ctx context.Context, userUUID string, id uint) error {
	return r.db.WithContext(ctx).
		Where("user_uuid = ? AND id = ?", userUUID, id).
		Delete(&searchentity.SearchHistory{}).Error
}

func (r *Repository) BulkDeleteSearchHistory(ctx context.Context, userUUID string) error {
	return r.db.WithContext(ctx).
		Where("user_uuid = ?", userUUID).
		Delete(&searchentity.SearchHistory{}).Error
}

func (r *Repository) LikeMovie(ctx context.Context, userUUID string, item likedentity.MovieLiked) (*likedentity.MovieLiked, error) {
	var existing likedentity.MovieLiked
	err := r.db.WithContext(ctx).
		Where("user_uuid = ? AND slug = ?", userUUID, item.Slug).
		First(&existing).Error
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}
	if errors.Is(err, gorm.ErrRecordNotFound) {
		if err := r.db.WithContext(ctx).Create(&item).Error; err != nil {
			return nil, err
		}
		return &item, nil
	}
	return &existing, nil
}

func (r *Repository) UnlikeMovie(ctx context.Context, userUUID string, slug string) error {
	return r.db.WithContext(ctx).
		Where("user_uuid = ? AND slug = ?", userUUID, slug).
		Delete(&likedentity.MovieLiked{}).Error
}

func (r *Repository) ListLikedMoviesPaged(ctx context.Context, userUUID string, page, limit int) ([]likedentity.MovieLiked, int64, error) {
	var total int64
	if err := r.db.WithContext(ctx).Model(&likedentity.MovieLiked{}).
		Where("user_uuid = ?", userUUID).Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var rows []likedentity.MovieLiked
	offset := (page - 1) * limit
	err := r.db.WithContext(ctx).
		Where("user_uuid = ?", userUUID).
		Order("liked_at DESC").Limit(limit).Offset(offset).
		Find(&rows).Error
	return rows, total, err
}

func (r *Repository) GetCertificationsBySlugs(ctx context.Context, slugs []string) ([]certentity.MovieCertification, error) {
	var rows []certentity.MovieCertification
	err := r.db.WithContext(ctx).Where("slug IN ? AND rating IS NOT NULL", slugs).Find(&rows).Error
	return rows, err
}

func (r *Repository) UpsertCertification(ctx context.Context, item certentity.MovieCertification) error {
	return r.db.WithContext(ctx).
		Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "slug"}},
			DoUpdates: clause.AssignmentColumns([]string{"rating", "fetched_at"}),
		}).Create(&item).Error
}

func (r *Repository) GetSeasons(ctx context.Context, baseSlug string) ([]seasonentity.MovieSeason, error) {
	var rows []seasonentity.MovieSeason
	err := r.db.WithContext(ctx).Where("base_slug = ?", baseSlug).Order("season_number ASC").Find(&rows).Error
	return rows, err
}

func (r *Repository) UpsertSeasons(ctx context.Context, seasons []seasonentity.MovieSeason) error {
	if len(seasons) == 0 {
		return nil
	}
	return r.db.WithContext(ctx).
		Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "base_slug"}, {Name: "season_number"}},
			DoUpdates: clause.AssignmentColumns([]string{"season_slug", "name", "fetched_at"}),
		}).Create(&seasons).Error
}

func (r *Repository) GetEpisodes(ctx context.Context, baseSlug string, seasonNumber int) ([]seasonentity.MovieEpisode, error) {
	var rows []seasonentity.MovieEpisode
	err := r.db.WithContext(ctx).
		Where("base_slug = ? AND season_number = ?", baseSlug, seasonNumber).
		Order("server_name ASC, episode_slug ASC").Find(&rows).Error
	return rows, err
}

func (r *Repository) UpsertEpisodes(ctx context.Context, episodes []seasonentity.MovieEpisode) error {
	if len(episodes) == 0 {
		return nil
	}
	return r.db.WithContext(ctx).
		Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "base_slug"}, {Name: "season_number"}, {Name: "server_name"}, {Name: "episode_slug"}},
			DoUpdates: clause.AssignmentColumns([]string{"episode_name", "overview", "still_path", "filename", "link_embed", "link_m3u8", "fetched_at"}),
		}).Create(&episodes).Error
}
