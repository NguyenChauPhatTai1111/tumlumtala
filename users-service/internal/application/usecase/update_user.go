package usecase

import (
	"context"
	"time"

	"github.com/tumlumtala/users-service/internal/application"
	"github.com/tumlumtala/users-service/internal/application/dto"
	"github.com/tumlumtala/users-service/internal/application/queryservice"
	"github.com/tumlumtala/users-service/internal/domain/repository"
)

type UpdateUserUseCase struct {
	repository repository.UserRepository
	queries    queryservice.UserQueryService
}

func NewUpdateUserUseCase(repository repository.UserRepository, queries queryservice.UserQueryService) *UpdateUserUseCase {
	return &UpdateUserUseCase{repository: repository, queries: queries}
}
func (uc *UpdateUserUseCase) Execute(ctx context.Context, input dto.UpdateUserInput) (*dto.UserDTO, error) {
	if err := validateID(input.ID); err != nil {
		return nil, err
	}
	email, fullname, err := normalizeUser(input.Email, input.Fullname)
	if err != nil {
		return nil, err
	}
	user, err := uc.queries.GetByID(ctx, input.ID)
	if err != nil {
		return nil, err
	}
	role, err := normalizeRole(input.Role, user.Role)
	if err != nil {
		return nil, err
	}
	user.Email, user.Fullname, user.Role, user.UpdatedAt = email, fullname, role, time.Now().UTC()
	if err := uc.repository.Update(ctx, user); err != nil {
		return nil, err
	}
	return application.ToUserDTO(user), nil
}
