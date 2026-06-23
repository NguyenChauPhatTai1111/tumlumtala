package usecase

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	contractevents "github.com/tumlumtala/contracts/events"
	"golang.org/x/crypto/bcrypt"

	"github.com/tumlumtala/users-service/internal/application"
	"github.com/tumlumtala/users-service/internal/application/dto"
	"github.com/tumlumtala/users-service/internal/application/queryservice"
	"github.com/tumlumtala/users-service/internal/domain/entity"
	domainerrors "github.com/tumlumtala/users-service/internal/domain/errors"
	"github.com/tumlumtala/users-service/internal/domain/repository"
	"github.com/tumlumtala/users-service/internal/shared/logger"
	"github.com/tumlumtala/users-service/internal/shared/observability"
)

type CreateUserUseCase struct {
	repository   repository.UserRepository
	queries      queryservice.UserQueryService
	events       repository.EventPublisher
	domainEvents DomainEventPublisher
}

func NewCreateUserUseCase(repo repository.UserRepository, queries queryservice.UserQueryService, events repository.EventPublisher) *CreateUserUseCase {
	return &CreateUserUseCase{repository: repo, queries: queries, events: events}
}

func (uc *CreateUserUseCase) WithDomainEvents(domainEvents DomainEventPublisher) *CreateUserUseCase {
	uc.domainEvents = domainEvents
	return uc
}

func (uc *CreateUserUseCase) Execute(ctx context.Context, input dto.CreateUserInput) (*dto.UserDTO, error) {
	return observability.TraceResult(ctx, "CreateUser UseCase", func(ctx context.Context) (*dto.UserDTO, error) {
		email, fullname, err := normalizeUser(input.Email, input.Fullname)
		if err != nil || len(input.Password) < 8 {
			return nil, domainerrors.ErrInvalidInput
		}
		role, err := normalizeRole(input.Role, entity.RoleMember)
		if err != nil {
			return nil, err
		}

		existing, err := observability.TraceResult(ctx, "CheckEmailExists", func(ctx context.Context) (*entity.User, error) {
			existing, err := uc.queries.GetByEmail(ctx, email)
			if errors.Is(err, domainerrors.ErrNotFound) {
				return nil, nil
			}
			return existing, err
		},
			observability.AttrLayer("usecase"),
			observability.AttrOperation("check_email_exists"),
			observability.AttrResourceType("user"),
		)
		if err != nil {
			return nil, err
		}
		if existing != nil {
			return nil, domainerrors.ErrEmailExists
		}

		hash, err := observability.TraceResult(ctx, "HashPassword", func(ctx context.Context) ([]byte, error) {
			return bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
		},
			observability.AttrLayer("usecase"),
			observability.AttrOperation("hash_password"),
		)
		if err != nil {
			return nil, err
		}

		now := time.Now().UTC()
		user := &entity.User{UUID: uuid.NewString(), Email: email, Password: string(hash), Fullname: fullname, Role: role, CreatedAt: now, UpdatedAt: now}

		if err := observability.Trace(ctx, "PersistUser", func(ctx context.Context) error {
			return uc.repository.Create(ctx, user)
		},
			observability.AttrLayer("usecase"),
			observability.AttrOperation("persist_user"),
			observability.AttrResourceType("user"),
		); err != nil {
			return nil, err
		}

		_ = uc.events.PublishUserCreated(ctx, user.ID, user.UUID, user.Email, user.Fullname, string(user.Role))
		uc.publishRabbitMQUserCreated(ctx, user)

		return application.ToUserDTO(user), nil
	},
		observability.AttrServiceName(logger.ServiceUsers),
		observability.AttrLayer("usecase"),
		observability.AttrOperation("create_user"),
		observability.AttrResourceType("user"),
	)
}

func (uc *CreateUserUseCase) publishRabbitMQUserCreated(ctx context.Context, user *entity.User) {
	if uc.domainEvents == nil {
		return
	}

	// Event contract thuộc application/usecase; RabbitMQ publisher chỉ nhận routing key và payload.
	event := contractevents.UserCreatedEvent{
		ID:        user.ID,
		UUID:      user.UUID,
		Email:     user.Email,
		Fullname:  user.Fullname,
		Role:      string(user.Role),
		CreatedAt: time.Now().UTC(),
	}
	if err := uc.domainEvents.Publish(ctx, "user.created", event); err != nil {
		log := logger.FromContext(ctx, logger.Nop())
		log.Error().Err(err).Str("routing_key", "user.created").Msg("publish rabbitmq user event failed")
	}
}
