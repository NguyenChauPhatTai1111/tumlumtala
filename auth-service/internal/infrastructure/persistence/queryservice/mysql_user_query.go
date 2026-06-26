package queryservice

import (
	"context"

	"github.com/tumlumtala/auth-service/internal/domain/entity"
	domainerrors "github.com/tumlumtala/auth-service/internal/domain/errors"
	"github.com/tumlumtala/auth-service/internal/infrastructure/persistence/model"
	"gorm.io/gorm"
)

type MySQLUserQueryRepository struct{ db *gorm.DB }

func NewMySQLUserQueryRepository(db *gorm.DB) *MySQLUserQueryRepository {
	return &MySQLUserQueryRepository{db: db}
}

func (r *MySQLUserQueryRepository) GetByEmail(ctx context.Context, email string) (*entity.User, error) {
	var m model.User
	if err := r.db.WithContext(ctx).Where("email = ?", email).First(&m).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, domainerrors.ErrInvalidCredentials
		}
		return nil, err
	}
	return m.ToEntity(), nil
}

func (r *MySQLUserQueryRepository) GetByUUID(ctx context.Context, uuid string) (*entity.User, error) {
	var m model.User
	if err := r.db.WithContext(ctx).Where("uuid = ?", uuid).First(&m).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, domainerrors.ErrInvalidCredentials
		}
		return nil, err
	}
	return m.ToEntity(), nil
}
