package usecase

import (
	"context"
	"time"

	"github.com/tumlumtala/users-service/internal/application"
	"github.com/tumlumtala/users-service/internal/application/dto"
	"github.com/tumlumtala/users-service/internal/application/queryservice"
	"github.com/tumlumtala/users-service/internal/domain/repository"
	"github.com/tumlumtala/users-service/internal/shared/logger"
	"github.com/tumlumtala/users-service/internal/shared/observability"
)

type ChangeUserStatusUseCase struct {
	repository repository.UserRepository
	queries    queryservice.UserQueryService
	events     repository.EventPublisher
}

func NewChangeUserStatusUseCase(repo repository.UserRepository, queries queryservice.UserQueryService, events repository.EventPublisher) *ChangeUserStatusUseCase {
	return &ChangeUserStatusUseCase{repository: repo, queries: queries, events: events}
}

func (uc *ChangeUserStatusUseCase) Execute(ctx context.Context, input dto.ChangeUserStatusInput) (*dto.UserDTO, error) {
	return observability.TraceResult(ctx, "ChangeUserStatus UseCase", func(ctx context.Context) (*dto.UserDTO, error) {
		if err := validateUUID(input.UUID); err != nil {
			return nil, err
		}
		user, err := uc.queries.GetByUUID(ctx, input.UUID)
		if err != nil {
			return nil, err
		}
		status, err := normalizeStatus(input.Status, user.Status)
		if err != nil {
			return nil, err
		}
		user.Status = status
		user.UpdatedAt = time.Now().UTC()

		if err := uc.repository.Update(ctx, user); err != nil {
			return nil, err
		}
		_ = uc.events.PublishUserUpdated(ctx, user.ID, user.UUID, user.Email, user.Fullname, user.Avatar, string(user.Role), string(user.Status))
		return application.ToUserDTO(user), nil
	},
		observability.AttrServiceName(logger.ServiceUsers),
		observability.AttrLayer("usecase"),
		observability.AttrOperation("change_user_status"),
		observability.AttrResourceType("user"),
	)
}
