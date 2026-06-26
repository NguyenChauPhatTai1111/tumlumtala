package model

import (
	"time"

	"github.com/tumlumtala/auth-service/internal/domain/entity"
)

type User struct {
	ID        uint64    `gorm:"primaryKey;autoIncrement;column:id"`
	UUID      string    `gorm:"column:uuid;uniqueIndex;not null"`
	Email     string    `gorm:"column:email;uniqueIndex;not null"`
	Password  string    `gorm:"column:password;not null"`
	Fullname  string    `gorm:"column:fullname;not null"`
	Role      string    `gorm:"column:role;default:member"`
	Status    string    `gorm:"column:status;default:active"`
	CreatedAt time.Time `gorm:"column:created_at;precision:6"`
	UpdatedAt time.Time `gorm:"column:updated_at;precision:6"`
}

func (User) TableName() string { return "users" }

func (m *User) ToEntity() *entity.User {
	return &entity.User{
		ID:        m.ID,
		UUID:      m.UUID,
		Email:     m.Email,
		Password:  m.Password,
		Fullname:  m.Fullname,
		Role:      m.Role,
		Status:    m.Status,
		CreatedAt: m.CreatedAt,
		UpdatedAt: m.UpdatedAt,
	}
}
