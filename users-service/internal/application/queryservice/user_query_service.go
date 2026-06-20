package queryservice

import (
	"context"

	"github.com/tumlumtala/users-service/internal/domain/entity"
)

// UserQueryService owns optimized read operations and is implemented by infrastructure.
type UserQueryService interface {
	GetByID(ctx context.Context, id string) (*entity.User, error)
	GetByEmail(ctx context.Context, email string) (*entity.User, error)
	List(ctx context.Context, limit, offset int32) ([]entity.User, error)
	Count(ctx context.Context) (int64, error)
}
