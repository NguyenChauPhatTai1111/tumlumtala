package service

import (
	"context"
	"errors"
	"strings"

	userdomain "github.com/tumlumtala/gateway/internal/domain/user"
	apperrors "github.com/tumlumtala/gateway/internal/shared/errors"
)

type UserClient interface {
	CreateUser(context.Context, userdomain.CreateUserInput) (userdomain.User, error)
	GetMe(context.Context, string) (map[string]any, error)
}

type UserService struct {
	userClient UserClient
}

func NewUserService(userClient UserClient) *UserService {
	return &UserService{userClient: userClient}
}

func (s *UserService) CreateUser(ctx context.Context, input userdomain.CreateUserInput) (userdomain.User, error) {
	input.Email = strings.TrimSpace(input.Email)
	input.Fullname = strings.TrimSpace(input.Fullname)
	if input.Email == "" || input.Password == "" || input.Fullname == "" {
		return userdomain.User{}, apperrors.New(apperrors.CodeBadRequest, "email, password and fullname are required", errors.New("missing create user fields"))
	}
	return s.userClient.CreateUser(ctx, input)
}

func (s *UserService) GetMe(ctx context.Context, userID string) (map[string]any, error) {
	if userID == "" {
		return nil, apperrors.New(apperrors.CodeBadRequest, "user_id is required", errors.New("missing user_id"))
	}
	return s.userClient.GetMe(ctx, userID)
}
