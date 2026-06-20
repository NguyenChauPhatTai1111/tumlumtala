package dto

import "time"

type CreateUserInput struct {
	Email, Password, Fullname, Role string
}

type UpdateUserInput struct {
	ID, Email, Fullname, Role string
}

type UserDTO struct {
	ID, Email, Fullname, Role string
	CreatedAt, UpdatedAt      time.Time
}

type UserListDTO struct {
	Users []UserDTO
	Total int64
}
