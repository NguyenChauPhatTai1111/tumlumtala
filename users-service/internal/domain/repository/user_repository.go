package repository

import (
	"context"

	"github.com/tumlumtala/users-service/internal/domain/entity"
)

// UserRepository owns the write side of the user aggregate.
type UserRepository interface {
	Create(ctx context.Context, user *entity.User) error
	Update(ctx context.Context, user *entity.User) error
	Delete(ctx context.Context, id string) error
}
