package usecase

import (
	"context"
	"github.com/tumlumtala/users-service/internal/domain/repository"
)

type DeleteUserUseCase struct{ repository repository.UserRepository }

func NewDeleteUserUseCase(repository repository.UserRepository) *DeleteUserUseCase {
	return &DeleteUserUseCase{repository: repository}
}
func (uc *DeleteUserUseCase) Execute(ctx context.Context, uuid string) error {
	if err := validateUUID(uuid); err != nil {
		return err
	}
	return uc.repository.Delete(ctx, uuid)
}
