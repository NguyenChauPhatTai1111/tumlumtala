package service

import (
	"context"
	"errors"
	"strings"

	"github.com/tumlumtala/gateway/internal/modules/user/domain"
	apperrors "github.com/tumlumtala/gateway/internal/shared/errors"
)

type UserClient interface {
	CreateUser(context.Context, domain.CreateUserInput) (domain.User, error)
	GetUser(context.Context, string) (domain.User, error)
	ListUsers(context.Context, domain.ListUsersInput) (domain.ListUsersResult, error)
	UpdateUser(context.Context, domain.UpdateUserInput) (domain.User, error)
	UpdateProfile(context.Context, domain.UpdateProfileInput) (domain.User, error)
	DeleteUser(context.Context, string) error
}

type UserService struct {
	userClient UserClient
}

func NewUserService(userClient UserClient) *UserService {
	return &UserService{userClient: userClient}
}

func (s *UserService) CreateUser(ctx context.Context, input domain.CreateUserInput) (domain.User, error) {
	input.Email = strings.TrimSpace(input.Email)
	input.Fullname = strings.TrimSpace(input.Fullname)
	if input.Email == "" || input.Password == "" || input.Fullname == "" {
		return domain.User{}, apperrors.New(apperrors.CodeBadRequest, "email, password and fullname are required", errors.New("missing create user fields"))
	}
	return s.userClient.CreateUser(ctx, input)
}

func (s *UserService) GetUser(ctx context.Context, uuid string) (domain.User, error) {
	if strings.TrimSpace(uuid) == "" {
		return domain.User{}, apperrors.New(apperrors.CodeBadRequest, "uuid is required", errors.New("missing uuid"))
	}
	return s.userClient.GetUser(ctx, uuid)
}

func (s *UserService) ListUsers(ctx context.Context, input domain.ListUsersInput) (domain.ListUsersResult, error) {
	if input.Limit <= 0 {
		input.Limit = 10
	}
	if input.Limit > 100 {
		input.Limit = 100
	}
	if input.Offset < 0 {
		input.Offset = 0
	}
	return s.userClient.ListUsers(ctx, input)
}

func (s *UserService) UpdateUser(ctx context.Context, input domain.UpdateUserInput) (domain.User, error) {
	if strings.TrimSpace(input.UUID) == "" {
		return domain.User{}, apperrors.New(apperrors.CodeBadRequest, "uuid is required", errors.New("missing uuid"))
	}
	input.Email = strings.TrimSpace(input.Email)
	input.Fullname = strings.TrimSpace(input.Fullname)
	return s.userClient.UpdateUser(ctx, input)
}

func (s *UserService) UpdateProfile(ctx context.Context, input domain.UpdateProfileInput) (domain.User, error) {
	if strings.TrimSpace(input.UUID) == "" {
		return domain.User{}, apperrors.New(apperrors.CodeBadRequest, "uuid is required", errors.New("missing uuid"))
	}
	input.Email = strings.TrimSpace(input.Email)
	input.Fullname = strings.TrimSpace(input.Fullname)
	input.Avatar = strings.TrimSpace(input.Avatar)
	return s.userClient.UpdateProfile(ctx, input)
}

func (s *UserService) DeleteUser(ctx context.Context, uuid string) error {
	if strings.TrimSpace(uuid) == "" {
		return apperrors.New(apperrors.CodeBadRequest, "uuid is required", errors.New("missing uuid"))
	}
	return s.userClient.DeleteUser(ctx, uuid)
}
