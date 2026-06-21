package usecase

import (
	"context"

	"github.com/tumlumtala/users-service/internal/domain/repository"
	"github.com/tumlumtala/users-service/internal/shared/logger"
	"github.com/tumlumtala/users-service/internal/shared/observability"
)

type DeleteUserUseCase struct{ repository repository.UserRepository }

func NewDeleteUserUseCase(repository repository.UserRepository) *DeleteUserUseCase {
	return &DeleteUserUseCase{repository: repository}
}
func (uc *DeleteUserUseCase) Execute(ctx context.Context, uuid string) error {
	return observability.Trace(ctx, "DeleteUser UseCase", func(ctx context.Context) error {
		if err := validateUUID(uuid); err != nil {
			return err
		}
		return observability.Trace(ctx, "DeleteUser", func(ctx context.Context) error {
			return uc.repository.Delete(ctx, uuid)
		},
			observability.AttrLayer("usecase"),
			observability.AttrOperation("delete_user"),
			observability.AttrResourceType("user"),
		)
	},
		observability.AttrServiceName(logger.ServiceUsers),
		observability.AttrLayer("usecase"),
		observability.AttrOperation("delete_user"),
		observability.AttrResourceType("user"),
	)
}
