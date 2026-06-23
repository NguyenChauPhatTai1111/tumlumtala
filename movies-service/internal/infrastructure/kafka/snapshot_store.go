package kafka

import (
	"context"
	"time"

	"gorm.io/gorm"
)

// SnapshotStore abstracts DB writes so handler logic can be tested without a real DB.
type SnapshotStore interface {
	Upsert(ctx context.Context, id uint64, uuid, email, fullname, avatar, role string, now time.Time) error
	Delete(ctx context.Context, id uint64) error
}

// gormSnapshotStore is the production implementation backed by *gorm.DB.
type gormSnapshotStore struct{ db *gorm.DB }

func newGormSnapshotStore(db *gorm.DB) SnapshotStore {
	return &gormSnapshotStore{db: db}
}

func (s *gormSnapshotStore) Upsert(ctx context.Context, id uint64, uuid, email, fullname, avatar, role string, now time.Time) error {
	return s.db.WithContext(ctx).Exec(`
		INSERT INTO user_snapshots (id, uuid, email, fullname, avatar, role, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)
		ON DUPLICATE KEY UPDATE
			email      = VALUES(email),
			fullname   = VALUES(fullname),
			avatar     = VALUES(avatar),
			role       = VALUES(role),
			updated_at = VALUES(updated_at)
	`, id, uuid, email, fullname, avatar, role, now).Error
}

func (s *gormSnapshotStore) Delete(ctx context.Context, id uint64) error {
	return s.db.WithContext(ctx).
		Table("user_snapshots").
		Where("id = ?", id).
		Delete(nil).Error
}
