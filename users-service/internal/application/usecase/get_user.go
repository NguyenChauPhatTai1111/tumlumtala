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
func (uc *GetUserUseCase) Execute(ctx context.Context, uuid string) (*dto.UserDTO, error) {
	if err := validateUUID(uuid); err != nil {
		return nil, err
	}
	user, err := uc.queries.GetByUUID(ctx, uuid)
	if err != nil {
		return nil, err
	}
	return application.ToUserDTO(user), nil
}
