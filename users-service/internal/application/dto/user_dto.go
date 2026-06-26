package dto

import "time"

type CreateUserInput struct {
	Email, Password, Fullname, Role, Status string
}

type UpdateUserInput struct {
	UUID, Email, Fullname, Avatar, Role string
}

type ChangeUserStatusInput struct {
	UUID, Status string
}

type UserDTO struct {
	ID                                          uint64
	UUID, Email, Fullname, Avatar, Role, Status string
	CreatedAt, UpdatedAt                        time.Time
}

type UserListDTO struct {
	Users []UserDTO
	Total int64
}
