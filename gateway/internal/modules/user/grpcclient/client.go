package grpcclient

import (
	"context"
	"strconv"

	userpb "github.com/tumlumtala/contracts/generated/user"
	"github.com/tumlumtala/gateway/internal/modules/user/domain"
	apperrors "github.com/tumlumtala/gateway/internal/shared/errors"
	"google.golang.org/grpc"
)

type UserClient interface {
	CreateUser(context.Context, domain.CreateUserInput) (domain.User, error)
	ListUsers(context.Context, domain.ListUsersInput) (domain.ListUsersResult, error)
	GetMe(context.Context, string) (map[string]any, error)
}

type userClient struct {
	conn   *grpc.ClientConn
	client userpb.UserServiceClient
}

func NewUserClient(conn *grpc.ClientConn) UserClient {
	return &userClient{
		conn:   conn,
		client: userpb.NewUserServiceClient(conn),
	}
}

func (c *userClient) CreateUser(ctx context.Context, input domain.CreateUserInput) (domain.User, error) {
	response, err := c.client.CreateUser(ctx, &userpb.CreateUserRequest{
		Email:    input.Email,
		Password: input.Password,
		Fullname: input.Fullname,
	})
	if err != nil {
		return domain.User{}, apperrors.FromGRPC(err)
	}
	return domain.User{
		ID:       strconv.FormatUint(response.GetId(), 10),
		UUID:     response.GetUuid(),
		Email:    response.GetEmail(),
		Fullname: response.GetFullname(),
		Role:     response.GetRole(),
	}, nil
}

func (c *userClient) ListUsers(ctx context.Context, input domain.ListUsersInput) (domain.ListUsersResult, error) {
	response, err := c.client.ListUsers(ctx, &userpb.ListUsersRequest{
		Limit:  input.Limit,
		Offset: input.Offset,
	})
	if err != nil {
		return domain.ListUsersResult{}, apperrors.FromGRPC(err)
	}

	users := make([]domain.User, 0, len(response.GetUsers()))
	for _, item := range response.GetUsers() {
		users = append(users, domain.User{
			ID:       strconv.FormatUint(item.GetId(), 10),
			UUID:     item.GetUuid(),
			Email:    item.GetEmail(),
			Fullname: item.GetFullname(),
			Role:     item.GetRole(),
		})
	}

	return domain.ListUsersResult{
		Users: users,
		Total: response.GetTotal(),
	}, nil
}

func (c *userClient) GetMe(_ context.Context, _ string) (map[string]any, error) {
	return nil, apperrors.New(apperrors.CodeUnavailable, "UserService.GetMe contract is not generated yet", nil)
}
