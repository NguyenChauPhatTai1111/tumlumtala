package grpcclient

import (
	"context"
	"strconv"

	userpb "github.com/tumlumtala/contracts/generated/user"
	"github.com/tumlumtala/gateway/internal/modules/user/domain"
	apperrors "github.com/tumlumtala/gateway/internal/shared/errors"
)

type UserClient interface {
	CreateUser(context.Context, domain.CreateUserInput) (domain.User, error)
	GetUser(context.Context, string) (domain.User, error)
	ListUsers(context.Context, domain.ListUsersInput) (domain.ListUsersResult, error)
	UpdateUser(context.Context, domain.UpdateUserInput) (domain.User, error)
	DeleteUser(context.Context, string) error
}

type userClient struct {
	client userpb.UserServiceClient
}

func NewUserClient(client userpb.UserServiceClient) UserClient {
	return &userClient{client: client}
}

func (c *userClient) CreateUser(ctx context.Context, input domain.CreateUserInput) (domain.User, error) {
	resp, err := c.client.CreateUser(ctx, &userpb.CreateUserRequest{
		Email:    input.Email,
		Password: input.Password,
		Fullname: input.Fullname,
	})
	if err != nil {
		return domain.User{}, apperrors.FromGRPC(err)
	}
	return mapCreateResponse(resp), nil
}

func (c *userClient) GetUser(ctx context.Context, uuid string) (domain.User, error) {
	resp, err := c.client.GetUser(ctx, &userpb.GetUserRequest{Uuid: uuid})
	if err != nil {
		return domain.User{}, apperrors.FromGRPC(err)
	}
	return mapUser(resp), nil
}

func (c *userClient) ListUsers(ctx context.Context, input domain.ListUsersInput) (domain.ListUsersResult, error) {
	resp, err := c.client.ListUsers(ctx, &userpb.ListUsersRequest{
		Limit:  input.Limit,
		Offset: input.Offset,
	})
	if err != nil {
		return domain.ListUsersResult{}, apperrors.FromGRPC(err)
	}

	users := make([]domain.User, 0, len(resp.GetUsers()))
	for _, item := range resp.GetUsers() {
		users = append(users, mapUser(item))
	}
	return domain.ListUsersResult{Users: users, Total: resp.GetTotal()}, nil
}

func (c *userClient) UpdateUser(ctx context.Context, input domain.UpdateUserInput) (domain.User, error) {
	resp, err := c.client.UpdateUser(ctx, &userpb.UpdateUserRequest{
		Uuid:     input.UUID,
		Email:    input.Email,
		Fullname: input.Fullname,
		Role:     input.Role,
	})
	if err != nil {
		return domain.User{}, apperrors.FromGRPC(err)
	}
	return mapUser(resp), nil
}

func (c *userClient) DeleteUser(ctx context.Context, uuid string) error {
	_, err := c.client.DeleteUser(ctx, &userpb.DeleteUserRequest{Uuid: uuid})
	if err != nil {
		return apperrors.FromGRPC(err)
	}
	return nil
}

func mapCreateResponse(r *userpb.CreateUserResponse) domain.User {
	return domain.User{
		ID:       strconv.FormatUint(r.GetId(), 10),
		UUID:     r.GetUuid(),
		Email:    r.GetEmail(),
		Fullname: r.GetFullname(),
		Role:     r.GetRole(),
	}
}

func mapUser(u *userpb.User) domain.User {
	return domain.User{
		ID:        strconv.FormatUint(u.GetId(), 10),
		UUID:      u.GetUuid(),
		Email:     u.GetEmail(),
		Fullname:  u.GetFullname(),
		Role:      u.GetRole(),
		CreatedAt: u.GetCreatedAt(),
		UpdatedAt: u.GetUpdatedAt(),
	}
}
