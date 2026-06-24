package usecase

import (
	"context"

	"github.com/tumlumtala/users-service/internal/application"
	"github.com/tumlumtala/users-service/internal/application/dto"
	"github.com/tumlumtala/users-service/internal/application/queryservice"
	domainerrors "github.com/tumlumtala/users-service/internal/domain/errors"
	"github.com/tumlumtala/users-service/internal/shared/logger"
	"github.com/tumlumtala/users-service/internal/shared/observability"
)

type ListUsersUseCase struct{ queries queryservice.UserQueryService }

func NewListUsersUseCase(queries queryservice.UserQueryService) *ListUsersUseCase {
	return &ListUsersUseCase{queries: queries}
}

func (uc *ListUsersUseCase) Execute(ctx context.Context, limit, offset int32, search string) (*dto.UserListDTO, error) {
	return observability.TraceResult(ctx, "ListUsers UseCase", func(ctx context.Context) (*dto.UserListDTO, error) {
		if limit <= 0 {
			limit = 20
		}
		if limit > 100 {
			limit = 100
		}
		if offset < 0 {
			return nil, domainerrors.ErrInvalidInput
		}
		users, err := uc.queries.List(ctx, limit, offset, search)
		if err != nil {
			return nil, err
		}
		total, err := uc.queries.Count(ctx, search)
		if err != nil {
			return nil, err
		}
		result := make([]dto.UserDTO, 0, len(users))
		for i := range users {
			result = append(result, *application.ToUserDTO(&users[i]))
		}
		return &dto.UserListDTO{Users: result, Total: total}, nil
	},
		observability.AttrServiceName(logger.ServiceUsers),
		observability.AttrLayer("usecase"),
		observability.AttrOperation("list_users"),
		observability.AttrResourceType("user"),
	)
}
