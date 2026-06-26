package model

import (
	"time"

	"github.com/tumlumtala/users-service/internal/domain/entity"
)

type User struct {
	ID        uint64    `gorm:"column:id;primaryKey;autoIncrement"`
	UUID      string    `gorm:"column:uuid;type:char(36);uniqueIndex;not null"`
	Email     string    `gorm:"column:email;size:320;uniqueIndex;not null"`
	Password  string    `gorm:"column:password;type:text;not null"`
	Fullname  string    `gorm:"column:fullname;size:200;not null"`
	Avatar    string    `gorm:"column:avatar;type:text"`
	Role      string    `gorm:"column:role;type:enum('administrator','member','manager');not null;default:member"`
	Status    string    `gorm:"column:status;type:enum('active','inactive');not null;default:active"`
	CreatedAt time.Time `gorm:"column:created_at;precision:6;not null"`
	UpdatedAt time.Time `gorm:"column:updated_at;precision:6;not null"`
}

func (User) TableName() string { return "users" }

func FromEntity(user *entity.User) *User {
	return &User{ID: user.ID, UUID: user.UUID, Email: user.Email, Password: user.Password, Fullname: user.Fullname, Avatar: user.Avatar, Role: string(user.Role), Status: string(user.Status), CreatedAt: user.CreatedAt, UpdatedAt: user.UpdatedAt}
}

func (user *User) ToEntity() *entity.User {
	return &entity.User{ID: user.ID, UUID: user.UUID, Email: user.Email, Password: user.Password, Fullname: user.Fullname, Avatar: user.Avatar, Role: entity.Role(user.Role), Status: entity.Status(user.Status), CreatedAt: user.CreatedAt, UpdatedAt: user.UpdatedAt}
}
