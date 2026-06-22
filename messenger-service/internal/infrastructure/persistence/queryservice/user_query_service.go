package queryservice

import (
	"context"

	queryservice "github.com/tumlumtala/messenger-service/internal/application/query"
	"gorm.io/gorm"
)

type mysqlUserQueryService struct {
	db *gorm.DB
}

func NewMySQLUserQueryService(db *gorm.DB) queryservice.UserQueryService {
	return &mysqlUserQueryService{db: db}
}

func (s *mysqlUserQueryService) GetUserByID(ctx context.Context, id uint) (*queryservice.UserDTO, error) {
	type userRow struct {
		ID       uint   `gorm:"column:id"`
		FullName string `gorm:"column:fullname"`
		Email    string `gorm:"column:email"`
	}
	var row userRow
	if err := s.db.WithContext(ctx).Table("user_snapshots").
		Select("id, fullname, email").
		Where("id = ?", id).
		First(&row).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}
	return &queryservice.UserDTO{
		ID:       row.ID,
		FullName: row.FullName,
		Email:    row.Email,
		Avatar:   "",
		Gender:   "",
	}, nil
}
