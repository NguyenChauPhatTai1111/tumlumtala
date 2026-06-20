package usecase

import (
	"context"

	"github.com/tumlumtala/users-service/internal/application"
	"github.com/tumlumtala/users-service/internal/application/dto"
	"github.com/tumlumtala/users-service/internal/application/queryservice"
)

type GetUserUseCase struct{ queries queryservice.UserQueryService }

func NewGetUserUseCase(queries queryservice.UserQueryService) *GetUserUseCase {
	return &GetUserUseCase{queries: queries}
}
func (uc *GetUserUseCase) Execute(ctx context.Context, id string) (*dto.UserDTO, error) {
	if err := validateID(id); err != nil {
		return nil, err
	}
	user, err := uc.queries.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	return application.ToUserDTO(user), nil
}
