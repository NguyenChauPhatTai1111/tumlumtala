package usecase

import (
	"context"
	"github.com/tumlumtala/users-service/internal/domain/repository"
)

type DeleteUserUseCase struct{ repository repository.UserRepository }

func NewDeleteUserUseCase(repository repository.UserRepository) *DeleteUserUseCase {
	return &DeleteUserUseCase{repository: repository}
}
func (uc *DeleteUserUseCase) Execute(ctx context.Context, id string) error {
	if err := validateID(id); err != nil {
		return err
	}
	return uc.repository.Delete(ctx, id)
}
