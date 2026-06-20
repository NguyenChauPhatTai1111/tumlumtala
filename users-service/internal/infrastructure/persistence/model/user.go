package model

import (
	"time"

	"github.com/tumlumtala/users-service/internal/domain/entity"
)

type User struct {
	ID        string    `gorm:"column:id;type:char(36);primaryKey"`
	Email     string    `gorm:"column:email;size:320;uniqueIndex;not null"`
	Password  string    `gorm:"column:password;type:text;not null"`
	Fullname  string    `gorm:"column:fullname;size:200;not null"`
	Role      string    `gorm:"column:role;type:enum('administrator','member','manager');not null;default:member"`
	CreatedAt time.Time `gorm:"column:created_at;precision:6;not null"`
	UpdatedAt time.Time `gorm:"column:updated_at;precision:6;not null"`
}

func (User) TableName() string { return "users" }

func FromEntity(user *entity.User) *User {
	return &User{ID: user.ID, Email: user.Email, Password: user.Password, Fullname: user.Fullname, Role: string(user.Role), CreatedAt: user.CreatedAt, UpdatedAt: user.UpdatedAt}
}

func (user *User) ToEntity() *entity.User {
	return &entity.User{ID: user.ID, Email: user.Email, Password: user.Password, Fullname: user.Fullname, Role: entity.Role(user.Role), CreatedAt: user.CreatedAt, UpdatedAt: user.UpdatedAt}
}
