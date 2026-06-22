package usecase

import (
	"context"
	"time"

	"github.com/tumlumtala/users-service/internal/application"
	"github.com/tumlumtala/users-service/internal/application/dto"
	"github.com/tumlumtala/users-service/internal/application/queryservice"
	"github.com/tumlumtala/users-service/internal/domain/entity"
	"github.com/tumlumtala/users-service/internal/domain/repository"
	"github.com/tumlumtala/users-service/internal/shared/logger"
	"github.com/tumlumtala/users-service/internal/shared/observability"
)

type UpdateUserUseCase struct {
	repository repository.UserRepository
	queries    queryservice.UserQueryService
	events     repository.EventPublisher
}

func NewUpdateUserUseCase(repo repository.UserRepository, queries queryservice.UserQueryService, events repository.EventPublisher) *UpdateUserUseCase {
	return &UpdateUserUseCase{repository: repo, queries: queries, events: events}
}

func (uc *UpdateUserUseCase) Execute(ctx context.Context, input dto.UpdateUserInput) (*dto.UserDTO, error) {
	return observability.TraceResult(ctx, "UpdateUser UseCase", func(ctx context.Context) (*dto.UserDTO, error) {
		if err := validateUUID(input.UUID); err != nil {
			return nil, err
		}
		email, fullname, err := normalizeUser(input.Email, input.Fullname)
		if err != nil {
			return nil, err
		}
		user, err := observability.TraceResult(ctx, "FetchUser", func(ctx context.Context) (*entity.User, error) {
			return uc.queries.GetByUUID(ctx, input.UUID)
		},
			observability.AttrLayer("usecase"),
			observability.AttrOperation("fetch_user"),
			observability.AttrResourceType("user"),
		)
		if err != nil {
			return nil, err
		}
		role, err := normalizeRole(input.Role, user.Role)
		if err != nil {
			return nil, err
		}
		user.Email, user.Fullname, user.Role, user.UpdatedAt = email, fullname, role, time.Now().UTC()
		if err := observability.Trace(ctx, "PersistUser", func(ctx context.Context) error {
			return uc.repository.Update(ctx, user)
		},
			observability.AttrLayer("usecase"),
			observability.AttrOperation("persist_user"),
			observability.AttrResourceType("user"),
		); err != nil {
			return nil, err
		}
		_ = uc.events.PublishUserUpdated(ctx, user.ID, user.UUID, user.Email, user.Fullname, string(user.Role))
		return application.ToUserDTO(user), nil
	},
		observability.AttrServiceName(logger.ServiceUsers),
		observability.AttrLayer("usecase"),
		observability.AttrOperation("update_user"),
		observability.AttrResourceType("user"),
	)
}
