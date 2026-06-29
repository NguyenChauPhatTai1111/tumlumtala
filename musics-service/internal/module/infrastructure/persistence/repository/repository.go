package repository

import (
	"context"
	"strings"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"github.com/tumlumtala/musics-service/internal/module/domain/entity/event"
	"github.com/tumlumtala/musics-service/internal/module/domain/entity/history"
	"github.com/tumlumtala/musics-service/internal/module/domain/entity/intelligence"
	"github.com/tumlumtala/musics-service/internal/module/domain/entity/library"
	"github.com/tumlumtala/musics-service/internal/module/domain/entity/liked"
	"github.com/tumlumtala/musics-service/internal/module/domain/entity/media"
	"github.com/tumlumtala/musics-service/internal/module/domain/entity/playlist"
	"github.com/tumlumtala/musics-service/internal/module/domain/entity/search"
)

type Repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) UpsertMediaItem(ctx context.Context, item media.MediaItem) (*media.MediaItem, error) {
	item.Title = strings.TrimSpace(item.Title)
	item.Artist = strings.TrimSpace(item.Artist)
	item.SourceID = strings.TrimSpace(item.SourceID)
	item.Type = strings.TrimSpace(item.Type)

	err := r.db.WithContext(ctx).
		Clauses(clause.OnConflict{
			Columns: []clause.Column{
				{Name: "user_uuid"},
				{Name: "source_id"},
				{Name: "type"},
			},
			DoUpdates: clause.AssignmentColumns([]string{
				"title", "artist", "thumbnail", "stream_url",
				"video_id", "duration", "view_count", "genre", "mood",
				"energy", "tempo", "musical_key", "is_instrumental",
				"vocal_gender", "like_count", "repost_count", "tags", "updated_at",
			}),
		}).
		Create(&item).Error
	if err != nil {
		return nil, err
	}

	var saved media.MediaItem
	err = r.db.WithContext(ctx).
		Where("user_uuid = ? AND source_id = ? AND type = ?", item.UserUUID, item.SourceID, item.Type).
		First(&saved).Error
	return &saved, err
}

func (r *Repository) Like(ctx context.Context, userUUID string, item media.MediaItem) (*liked.LikedTrack, error) {
	saved, err := r.UpsertMediaItem(ctx, item)
	if err != nil {
		return nil, err
	}

	track := liked.LikedTrack{UserUUID: userUUID, MediaItemID: saved.ID}
	err = r.db.WithContext(ctx).
		Clauses(clause.OnConflict{DoNothing: true}).
		Create(&track).Error
	if err != nil {
		return nil, err
	}

	err = r.db.WithContext(ctx).
		Preload("MediaItem").
		Where("user_uuid = ? AND media_item_id = ?", userUUID, saved.ID).
		First(&track).Error
	return &track, err
}

func (r *Repository) Unlike(ctx context.Context, userUUID, sourceID, mediaType string) error {
	return r.db.WithContext(ctx).
		Where("user_uuid = ?", userUUID).
		Where("media_item_id IN (?)",
			r.db.Model(&media.MediaItem{}).
				Select("id").
				Where("user_uuid = ? AND source_id = ? AND type = ?", userUUID, sourceID, mediaType),
		).
		Delete(&liked.LikedTrack{}).Error
}

func (r *Repository) ListLiked(ctx context.Context, userUUID string) ([]liked.LikedTrack, error) {
	var rows []liked.LikedTrack
	err := r.db.WithContext(ctx).
		Preload("MediaItem").
		Where("user_uuid = ?", userUUID).
		Order("id DESC").
		Limit(100).
		Find(&rows).Error
	return rows, err
}

func (r *Repository) AddRecent(ctx context.Context, userUUID string, item media.MediaItem) (*history.RecentTrack, error) {
	saved, err := r.UpsertMediaItem(ctx, item)
	if err != nil {
		return nil, err
	}

	now := time.Now()
	var recent history.RecentTrack
	err = r.db.WithContext(ctx).
		Where("user_uuid = ? AND media_item_id = ?", userUUID, saved.ID).
		First(&recent).Error
	if err != nil && err != gorm.ErrRecordNotFound {
		return nil, err
	}
	if err == gorm.ErrRecordNotFound {
		recent = history.RecentTrack{
			UserUUID:    userUUID,
			MediaItemID: saved.ID,
			PlayedAt:    now,
		}
		if err := r.db.WithContext(ctx).Create(&recent).Error; err != nil {
			return nil, err
		}
	} else if err := r.db.WithContext(ctx).Model(&recent).Update("played_at", now).Error; err != nil {
		return nil, err
	}

	err = r.db.WithContext(ctx).Preload("MediaItem").First(&recent, recent.ID).Error
	return &recent, err
}

func (r *Repository) ListRecent(ctx context.Context, userUUID string) ([]history.RecentTrack, error) {
	var rows []history.RecentTrack
	latestIDs := r.db.Model(&history.RecentTrack{}).
		Select("MAX(id)").
		Where("user_uuid = ?", userUUID).
		Group("media_item_id")
	err := r.db.WithContext(ctx).
		Preload("MediaItem").
		Where("id IN (?)", latestIDs).
		Order("played_at DESC").
		Limit(50).
		Find(&rows).Error
	return rows, err
}

func (r *Repository) AddSearchHistory(ctx context.Context, userUUID, keyword string) (*search.SearchHistory, error) {
	keyword = strings.TrimSpace(keyword)
	now := time.Now()
	var row search.SearchHistory

	err := r.db.WithContext(ctx).
		Where("user_uuid = ? AND LOWER(keyword) = LOWER(?)", userUUID, keyword).
		Order("updated_at DESC, created_at DESC, id DESC").
		First(&row).Error
	if err != nil && err != gorm.ErrRecordNotFound {
		return nil, err
	}

	if err == gorm.ErrRecordNotFound {
		row = search.SearchHistory{
			UserUUID:  userUUID,
			Keyword:   keyword,
			CreatedAt: now,
			UpdatedAt: now,
		}
		if err := r.db.WithContext(ctx).Create(&row).Error; err != nil {
			return nil, err
		}
		return &row, nil
	}

	if err := r.db.WithContext(ctx).Model(&row).Updates(map[string]any{
		"keyword":    keyword,
		"updated_at": now,
	}).Error; err != nil {
		return nil, err
	}

	if err := r.db.WithContext(ctx).
		Where("user_uuid = ? AND id <> ? AND LOWER(keyword) = LOWER(?)", userUUID, row.ID, keyword).
		Delete(&search.SearchHistory{}).Error; err != nil {
		return nil, err
	}

	err = r.db.WithContext(ctx).First(&row, row.ID).Error
	return &row, err
}

func (r *Repository) ListSearchHistory(ctx context.Context, userUUID string) ([]search.SearchHistory, error) {
	var rows []search.SearchHistory
	err := r.db.WithContext(ctx).
		Where("user_uuid = ?", userUUID).
		Order("updated_at DESC, created_at DESC, id DESC").
		Limit(100).
		Find(&rows).Error
	if err != nil {
		return nil, err
	}

	seen := map[string]struct{}{}
	uniqueRows := make([]search.SearchHistory, 0, len(rows))
	for _, row := range rows {
		normalized := strings.ToLower(strings.TrimSpace(row.Keyword))
		if normalized == "" {
			continue
		}
		if _, ok := seen[normalized]; ok {
			continue
		}
		seen[normalized] = struct{}{}
		uniqueRows = append(uniqueRows, row)
		if len(uniqueRows) == 30 {
			break
		}
	}
	return uniqueRows, nil
}

func (r *Repository) DeleteSearchHistory(ctx context.Context, userUUID string, id uint64) error {
	return r.db.WithContext(ctx).
		Where("user_uuid = ? AND id = ?", userUUID, id).
		Delete(&search.SearchHistory{}).Error
}

func (r *Repository) ClearSearchHistory(ctx context.Context, userUUID string) error {
	return r.db.WithContext(ctx).
		Where("user_uuid = ?", userUUID).
		Delete(&search.SearchHistory{}).Error
}

func (r *Repository) CreatePlaylist(ctx context.Context, p playlist.Playlist) (*playlist.Playlist, error) {
	err := r.db.WithContext(ctx).Create(&p).Error
	return &p, err
}

func (r *Repository) ListPlaylists(ctx context.Context, userUUID string) ([]playlist.Playlist, error) {
	var rows []playlist.Playlist
	err := r.db.WithContext(ctx).
		Preload("Tracks", func(db *gorm.DB) *gorm.DB {
			return db.Order("position ASC, id ASC")
		}).
		Preload("Tracks.MediaItem").
		Where("user_uuid = ?", userUUID).
		Order("updated_at DESC").
		Find(&rows).Error
	return rows, err
}

func (r *Repository) DeletePlaylist(ctx context.Context, userUUID string, playlistID uint64) error {
	return r.db.WithContext(ctx).
		Where("id = ? AND user_uuid = ?", playlistID, userUUID).
		Delete(&playlist.Playlist{}).Error
}

func (r *Repository) AddPlaylistTrack(ctx context.Context, userUUID string, playlistID uint64, item media.MediaItem, position int) (*playlist.PlaylistTrack, error) {
	var count int64
	if err := r.db.WithContext(ctx).
		Model(&playlist.Playlist{}).
		Where("id = ? AND user_uuid = ?", playlistID, userUUID).
		Count(&count).Error; err != nil {
		return nil, err
	}
	if count == 0 {
		return nil, gorm.ErrRecordNotFound
	}

	saved, err := r.UpsertMediaItem(ctx, item)
	if err != nil {
		return nil, err
	}

	track := playlist.PlaylistTrack{
		PlaylistID:  playlistID,
		MediaItemID: saved.ID,
		Position:    position,
	}
	err = r.db.WithContext(ctx).
		Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "playlist_id"}, {Name: "media_item_id"}},
			DoUpdates: clause.AssignmentColumns([]string{"position"}),
		}).
		Create(&track).Error
	if err != nil {
		return nil, err
	}

	err = r.db.WithContext(ctx).
		Preload("MediaItem").
		Where("playlist_id = ? AND media_item_id = ?", playlistID, saved.ID).
		First(&track).Error
	return &track, err
}

func (r *Repository) ListLibraryItems(ctx context.Context, userUUID string) ([]library.Item, error) {
	var rows []library.Item
	err := r.db.WithContext(ctx).
		Where("user_uuid = ?", userUUID).
		Order("updated_at DESC, id DESC").
		Find(&rows).Error
	return rows, err
}

func (r *Repository) AddLibraryItem(ctx context.Context, item library.Item) (*library.Item, error) {
	err := r.db.WithContext(ctx).
		Clauses(clause.OnConflict{
			Columns: []clause.Column{
				{Name: "user_uuid"},
				{Name: "item_type"},
				{Name: "source_id"},
			},
			DoUpdates: clause.AssignmentColumns([]string{
				"title", "subtitle", "thumbnail", "metadata", "updated_at",
			}),
		}).
		Create(&item).Error
	if err != nil {
		return nil, err
	}
	err = r.db.WithContext(ctx).
		Where("user_uuid = ? AND item_type = ? AND source_id = ?", item.UserUUID, item.ItemType, item.SourceID).
		First(&item).Error
	return &item, err
}

func (r *Repository) RemoveLibraryItem(ctx context.Context, userUUID string, itemID uint64) error {
	return r.db.WithContext(ctx).
		Where("id = ? AND user_uuid = ?", itemID, userUUID).
		Delete(&library.Item{}).Error
}

func (r *Repository) AddListeningEvent(ctx context.Context, e event.ListeningEvent) (*event.ListeningEvent, error) {
	e.OccurredAt = time.Now()
	if e.EventUUID != nil && *e.EventUUID != "" {
		result := r.db.WithContext(ctx).
			Clauses(clause.OnConflict{
				Columns:   []clause.Column{{Name: "event_uuid"}},
				DoNothing: true,
			}).
			Create(&e)
		if result.Error != nil {
			return nil, result.Error
		}
		var saved event.ListeningEvent
		if err := r.db.WithContext(ctx).
			Where("event_uuid = ?", *e.EventUUID).
			First(&saved).Error; err != nil {
			return nil, err
		}
		saved.Duplicate = result.RowsAffected == 0
		return &saved, nil
	}
	if err := r.db.WithContext(ctx).Create(&e).Error; err != nil {
		return nil, err
	}
	return &e, nil
}

func (r *Repository) UpsertDNADimension(ctx context.Context, dimension intelligence.DNADimension) error {
	return r.db.WithContext(ctx).
		Clauses(clause.OnConflict{
			Columns: []clause.Column{
				{Name: "user_uuid"},
				{Name: "dimension_type"},
				{Name: "dimension_value"},
			},
			DoUpdates: clause.Assignments(map[string]interface{}{
				"positive_score":      gorm.Expr("positive_score + ?", dimension.PositiveScore),
				"negative_score":      gorm.Expr("negative_score + ?", dimension.NegativeScore),
				"play_count":          gorm.Expr("play_count + ?", dimension.PlayCount),
				"completion_sum":      gorm.Expr("completion_sum + ?", dimension.CompletionSum),
				"skip_count":          gorm.Expr("skip_count + ?", dimension.SkipCount),
				"last_interaction_at": dimension.LastInteractionAt,
				"updated_at":          time.Now(),
			}),
		}).
		Create(&dimension).Error
}

func (r *Repository) ListDNADimensions(ctx context.Context, userUUID string) ([]intelligence.DNADimension, error) {
	var rows []intelligence.DNADimension
	err := r.db.WithContext(ctx).
		Where("user_uuid = ?", userUUID).
		Order("(positive_score - negative_score) DESC, play_count DESC").
		Find(&rows).Error
	return rows, err
}

func (r *Repository) ListListeningEventsSince(ctx context.Context, userUUID string, since time.Time, limit int) ([]event.ListeningEvent, error) {
	var rows []event.ListeningEvent
	err := r.db.WithContext(ctx).
		Where("user_uuid = ? AND occurred_at >= ?", userUUID, since).
		Order("occurred_at DESC").
		Limit(limit).
		Find(&rows).Error
	return rows, err
}

func (r *Repository) ListCommunityEventsSince(ctx context.Context, excludeUserUUID string, since time.Time, limit int) ([]event.ListeningEvent, error) {
	var rows []event.ListeningEvent
	err := r.db.WithContext(ctx).
		Where("user_uuid <> ? AND occurred_at >= ?", excludeUserUUID, since).
		Where("previous_source_id IS NOT NULL AND previous_source_id <> ''").
		Order("occurred_at DESC").
		Limit(limit).
		Find(&rows).Error
	return rows, err
}

func (r *Repository) ListCandidateMedia(ctx context.Context, userUUID string, limit int) ([]media.MediaItem, error) {
	var rows []media.MediaItem
	err := r.db.WithContext(ctx).
		Where("user_uuid = ?", userUUID).
		Order("updated_at DESC").
		Limit(limit).
		Find(&rows).Error
	return rows, err
}

func (r *Repository) ListHiddenGemMedia(ctx context.Context, limit int) ([]media.MediaItem, error) {
	var rows []media.MediaItem
	err := r.db.WithContext(ctx).
		Where("view_count < ?", 1000).
		Order("(like_count + repost_count * 2) DESC, updated_at DESC").
		Limit(limit).
		Find(&rows).Error
	return rows, err
}

func (r *Repository) FindMediaBySourceIDs(ctx context.Context, sourceIDs []string) ([]media.MediaItem, error) {
	if len(sourceIDs) == 0 {
		return []media.MediaItem{}, nil
	}
	var rows []media.MediaItem
	latestIDs := r.db.Model(&media.MediaItem{}).
		Select("MAX(id)").
		Where("source_id IN ?", sourceIDs).
		Group("source_id")
	err := r.db.WithContext(ctx).
		Where("id IN (?)", latestIDs).
		Find(&rows).Error
	return rows, err
}

func (r *Repository) CreateAISession(ctx context.Context, session intelligence.AISession) error {
	return r.db.WithContext(ctx).Create(&session).Error
}

func (r *Repository) UpdateAISession(ctx context.Context, session intelligence.AISession) error {
	return r.db.WithContext(ctx).
		Model(&intelligence.AISession{}).
		Where("id = ? AND user_uuid = ?", session.ID, session.UserUUID).
		Updates(map[string]any{
			"prompt":            session.Prompt,
			"title":             session.Title,
			"assistant_message": session.AssistantMessage,
			"status":            session.Status,
			"plan":              session.Plan,
			"context":           session.Context,
			"updated_at":        time.Now(),
		}).Error
}

func (r *Repository) GetAISession(ctx context.Context, userUUID, sessionID string) (*intelligence.AISession, error) {
	var session intelligence.AISession
	err := r.db.WithContext(ctx).
		Where("id = ? AND user_uuid = ?", sessionID, userUUID).
		First(&session).Error
	return &session, err
}

func (r *Repository) AddAIMessage(ctx context.Context, message intelligence.AIMessage) error {
	return r.db.WithContext(ctx).Create(&message).Error
}

func (r *Repository) ListAIMessages(ctx context.Context, sessionID string) ([]intelligence.AIMessage, error) {
	var rows []intelligence.AIMessage
	err := r.db.WithContext(ctx).
		Where("session_id = ?", sessionID).
		Order("id ASC").
		Find(&rows).Error
	return rows, err
}

func (r *Repository) ReplaceAISessionTracks(ctx context.Context, sessionID string, tracks []intelligence.AISessionTrack) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("session_id = ?", sessionID).Delete(&intelligence.AISessionTrack{}).Error; err != nil {
			return err
		}
		if len(tracks) == 0 {
			return nil
		}
		return tx.Create(&tracks).Error
	})
}

func (r *Repository) AppendAISessionTracks(ctx context.Context, sessionID string, tracks []intelligence.AISessionTrack) error {
	if len(tracks) == 0 {
		return nil
	}
	return r.db.WithContext(ctx).Create(&tracks).Error
}

func (r *Repository) ListAISessionTracks(ctx context.Context, sessionID string) ([]intelligence.AISessionTrack, error) {
	var rows []intelligence.AISessionTrack
	err := r.db.WithContext(ctx).
		Preload("MediaItem").
		Where("session_id = ?", sessionID).
		Order("position ASC").
		Find(&rows).Error
	return rows, err
}

func (r *Repository) UpsertChallengeProgress(ctx context.Context, progress intelligence.ChallengeProgress) error {
	return r.db.WithContext(ctx).
		Clauses(clause.OnConflict{
			Columns: []clause.Column{
				{Name: "user_uuid"},
				{Name: "challenge_key"},
				{Name: "period_key"},
			},
			DoUpdates: clause.AssignmentColumns([]string{
				"progress", "target", "completed_at", "updated_at",
			}),
		}).
		Create(&progress).Error
}

func (r *Repository) CreateSyncRoom(ctx context.Context, room intelligence.SyncRoom) error {
	return r.db.WithContext(ctx).Create(&room).Error
}

func (r *Repository) JoinSyncRoom(ctx context.Context, userUUID, inviteCode string) (*intelligence.SyncRoom, error) {
	var room intelligence.SyncRoom
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("invite_code = ? AND status = ? AND expires_at > ?", strings.ToUpper(inviteCode), "waiting", time.Now()).
			First(&room).Error; err != nil {
			return err
		}
		if room.OwnerUUID == userUUID {
			return gorm.ErrInvalidData
		}
		room.GuestUUID = &userUUID
		room.Status = "active"
		return tx.Save(&room).Error
	})
	return &room, err
}

func (r *Repository) GetSyncRoom(ctx context.Context, userUUID, roomID string) (*intelligence.SyncRoom, error) {
	var room intelligence.SyncRoom
	err := r.db.WithContext(ctx).
		Where("id = ? AND (owner_uuid = ? OR guest_uuid = ?)", roomID, userUUID, userUUID).
		First(&room).Error
	return &room, err
}

func (r *Repository) ListListeningEvents(ctx context.Context, userUUID string, limit int) ([]event.ListeningEvent, error) {
	var events []event.ListeningEvent
	err := r.db.WithContext(ctx).
		Where("user_uuid = ?", userUUID).
		Order("occurred_at DESC").
		Limit(limit).
		Find(&events).Error
	return events, err
}

func (r *Repository) GetUserDNA(ctx context.Context, userUUID string) ([]event.UserDNA, error) {
	var dna []event.UserDNA
	err := r.db.WithContext(ctx).
		Where("user_uuid = ?", userUUID).
		Order("play_count DESC").
		Find(&dna).Error
	return dna, err
}

func (r *Repository) UpsertUserDNA(ctx context.Context, dna event.UserDNA) error {
	return r.db.WithContext(ctx).
		Clauses(clause.OnConflict{
			Columns: []clause.Column{{Name: "user_uuid"}, {Name: "genre"}},
			DoUpdates: clause.Assignments(map[string]interface{}{
				"play_count":     gorm.Expr("play_count + ?", dna.PlayCount),
				"completion_sum": gorm.Expr("completion_sum + ?", dna.CompletionSum),
				"skip_count":     gorm.Expr("skip_count + ?", dna.SkipCount),
				"last_played_at": dna.LastPlayedAt,
				"updated_at":     time.Now(),
			}),
		}).
		Create(&dna).Error
}
