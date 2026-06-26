package application

import (
	"github.com/tumlumtala/users-service/internal/application/dto"
	"github.com/tumlumtala/users-service/internal/domain/entity"
)

func ToUserDTO(user *entity.User) *dto.UserDTO {
	if user == nil {
		return nil
	}
	return &dto.UserDTO{ID: user.ID, UUID: user.UUID, Email: user.Email, Fullname: user.Fullname, Avatar: user.Avatar, Role: string(user.Role), Status: string(user.Status), CreatedAt: user.CreatedAt, UpdatedAt: user.UpdatedAt}
}
