package queryservice

import (
	"context"

	"github.com/tumlumtala/users-service/internal/domain/entity"
	"github.com/tumlumtala/users-service/internal/infrastructure/persistence"
	"github.com/tumlumtala/users-service/internal/infrastructure/persistence/model"
	"gorm.io/gorm"
)

type MySQLUserQueryService struct{ db *gorm.DB }

func NewMySQLUserQueryService(db *gorm.DB) *MySQLUserQueryService {
	return &MySQLUserQueryService{db: db}
}

func (q *MySQLUserQueryService) GetByUUID(ctx context.Context, uuid string) (*entity.User, error) {
	var user model.User
	err := q.db.WithContext(ctx).Where("uuid = ?", uuid).First(&user).Error
	if err != nil {
		return nil, persistence.TranslateError(err)
	}
	return user.ToEntity(), nil
}

func (q *MySQLUserQueryService) GetByEmail(ctx context.Context, email string) (*entity.User, error) {
	var user model.User
	err := q.db.WithContext(ctx).Where("email = ?", email).First(&user).Error
	if err != nil {
		return nil, persistence.TranslateError(err)
	}
	return user.ToEntity(), nil
}

func (q *MySQLUserQueryService) List(ctx context.Context, limit, offset int32, search string) ([]entity.User, error) {
	var records []model.User
	db := q.db.WithContext(ctx).Order("created_at DESC")
	if search != "" {
		like := "%" + search + "%"
		db = db.Where("fullname LIKE ? OR email LIKE ?", like, like)
	}
	err := db.Limit(int(limit)).Offset(int(offset)).Find(&records).Error
	if err != nil {
		return nil, err
	}
	users := make([]entity.User, 0, len(records))
	for i := range records {
		users = append(users, *records[i].ToEntity())
	}
	return users, nil
}

func (q *MySQLUserQueryService) Count(ctx context.Context, search string) (int64, error) {
	var total int64
	db := q.db.WithContext(ctx).Model(&model.User{})
	if search != "" {
		like := "%" + search + "%"
		db = db.Where("fullname LIKE ? OR email LIKE ?", like, like)
	}
	err := db.Count(&total).Error
	return total, err
}
