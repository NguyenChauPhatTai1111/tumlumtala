package repository

import (
	"context"

	"github.com/tumlumtala/users-service/internal/domain/entity"
	domainerrors "github.com/tumlumtala/users-service/internal/domain/errors"
	"github.com/tumlumtala/users-service/internal/infrastructure/persistence"
	"github.com/tumlumtala/users-service/internal/infrastructure/persistence/model"
	"gorm.io/gorm"
)

type MySQLUserRepository struct{ db *gorm.DB }

func NewMySQLUserRepository(db *gorm.DB) *MySQLUserRepository { return &MySQLUserRepository{db: db} }

func (r *MySQLUserRepository) Create(ctx context.Context, user *entity.User) error {
	record := model.FromEntity(user)
	err := r.db.WithContext(ctx).Create(record).Error
	if err == nil {
		user.ID = record.ID
	}
	return persistence.TranslateError(err)
}

func (r *MySQLUserRepository) Update(ctx context.Context, user *entity.User) error {
	result := r.db.WithContext(ctx).Model(&model.User{}).Where("uuid = ?", user.UUID).Updates(map[string]any{
		"email": user.Email, "fullname": user.Fullname, "role": user.Role, "updated_at": user.UpdatedAt,
	})
	if result.Error != nil {
		return persistence.TranslateError(result.Error)
	}
	if result.RowsAffected == 0 {
		var count int64
		if err := r.db.WithContext(ctx).Model(&model.User{}).Where("uuid = ?", user.UUID).Count(&count).Error; err != nil {
			return err
		}
		if count == 0 {
			return domainerrors.ErrNotFound
		}
	}
	return nil
}

func (r *MySQLUserRepository) Delete(ctx context.Context, uuid string) error {
	result := r.db.WithContext(ctx).Where("uuid = ?", uuid).Delete(&model.User{})
	if result.Error != nil {
		return persistence.TranslateError(result.Error)
	}
	if result.RowsAffected == 0 {
		return domainerrors.ErrNotFound
	}
	return nil
}
