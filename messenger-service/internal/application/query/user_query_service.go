package queryservice

import "context"

type UserDTO struct {
	ID       uint
	FullName string
	Email    string
	Avatar   string
	Gender   string
}

type UserQueryService interface {
	GetUserByID(ctx context.Context, id uint) (*UserDTO, error)
}
