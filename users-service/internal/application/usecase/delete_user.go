package usecase

import (
	"context"

	"github.com/tumlumtala/users-service/internal/application/queryservice"
	"github.com/tumlumtala/users-service/internal/domain/repository"
	"github.com/tumlumtala/users-service/internal/shared/logger"
	"github.com/tumlumtala/users-service/internal/shared/observability"
)

type DeleteUserUseCase struct {
	repository repository.UserRepository
	queries    queryservice.UserQueryService
	events     repository.EventPublisher
}

func NewDeleteUserUseCase(repo repository.UserRepository, queries queryservice.UserQueryService, events repository.EventPublisher) *DeleteUserUseCase {
	return &DeleteUserUseCase{repository: repo, queries: queries, events: events}
}

func (uc *DeleteUserUseCase) Execute(ctx context.Context, uuid string) error {
	return observability.Trace(ctx, "DeleteUser UseCase", func(ctx context.Context) error {
		if err := validateUUID(uuid); err != nil {
			return err
		}
		user, err := uc.queries.GetByUUID(ctx, uuid)
		if err != nil {
			return err
		}
		if err := observability.Trace(ctx, "DeleteUser", func(ctx context.Context) error {
			return uc.repository.Delete(ctx, uuid)
		},
			observability.AttrLayer("usecase"),
			observability.AttrOperation("delete_user"),
			observability.AttrResourceType("user"),
		); err != nil {
			return err
		}
		_ = uc.events.PublishUserDeleted(ctx, user.ID, user.UUID)
		return nil
	},
		observability.AttrServiceName(logger.ServiceUsers),
		observability.AttrLayer("usecase"),
		observability.AttrOperation("delete_user"),
		observability.AttrResourceType("user"),
	)
}
