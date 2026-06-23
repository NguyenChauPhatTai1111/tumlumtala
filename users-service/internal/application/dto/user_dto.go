package dto

import "time"

type CreateUserInput struct {
	Email, Password, Fullname, Role string
}

type UpdateUserInput struct {
	UUID, Email, Fullname, Avatar, Role string
}

type UserDTO struct {
	ID                                  uint64
	UUID, Email, Fullname, Avatar, Role string
	CreatedAt, UpdatedAt                time.Time
}

type UserListDTO struct {
	Users []UserDTO
	Total int64
}
