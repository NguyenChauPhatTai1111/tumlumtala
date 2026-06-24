package queryservice

import (
	"context"

	"github.com/tumlumtala/users-service/internal/domain/entity"
)

// UserQueryService owns optimized read operations and is implemented by infrastructure.
type UserQueryService interface {
	GetByUUID(ctx context.Context, uuid string) (*entity.User, error)
	GetByEmail(ctx context.Context, email string) (*entity.User, error)
	List(ctx context.Context, limit, offset int32, search string) ([]entity.User, error)
	Count(ctx context.Context, search string) (int64, error)
}
