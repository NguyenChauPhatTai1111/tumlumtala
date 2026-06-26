package repository

import (
	"context"

	"github.com/tumlumtala/auth-service/internal/domain/entity"
)

type UserQueryRepository interface {
	GetByEmail(ctx context.Context, email string) (*entity.User, error)
	GetByUUID(ctx context.Context, uuid string) (*entity.User, error)
}
