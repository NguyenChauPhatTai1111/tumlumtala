package usecase

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/tumlumtala/users-service/internal/application"
	"github.com/tumlumtala/users-service/internal/application/dto"
	"github.com/tumlumtala/users-service/internal/application/queryservice"
	"github.com/tumlumtala/users-service/internal/domain/entity"
	domainerrors "github.com/tumlumtala/users-service/internal/domain/errors"
	"github.com/tumlumtala/users-service/internal/domain/repository"
	"golang.org/x/crypto/bcrypt"
)

type CreateUserUseCase struct {
	repository repository.UserRepository
	queries    queryservice.UserQueryService
}

func NewCreateUserUseCase(repository repository.UserRepository, queries queryservice.UserQueryService) *CreateUserUseCase {
	return &CreateUserUseCase{repository: repository, queries: queries}
}

func (uc *CreateUserUseCase) Execute(ctx context.Context, input dto.CreateUserInput) (*dto.UserDTO, error) {
	email, fullname, err := normalizeUser(input.Email, input.Fullname)
	if err != nil || len(input.Password) < 8 {
		return nil, domainerrors.ErrInvalidInput
	}
	role, err := normalizeRole(input.Role, entity.RoleMember)
	if err != nil {
		return nil, err
	}
	existing, err := uc.queries.GetByEmail(ctx, email)
	if err != nil && !errors.Is(err, domainerrors.ErrNotFound) {
		return nil, err
	}
	if existing != nil {
		return nil, domainerrors.ErrEmailExists
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}
	now := time.Now().UTC()
	user := &entity.User{UUID: uuid.NewString(), Email: email, Password: string(hash), Fullname: fullname, Role: role, CreatedAt: now, UpdatedAt: now}
	if err := uc.repository.Create(ctx, user); err != nil {
		return nil, err
	}
	return application.ToUserDTO(user), nil
}
