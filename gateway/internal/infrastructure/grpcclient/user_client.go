package grpcclient

import (
	"context"

	userpb "github.com/tumlumtala/contracts/generated/user"
	userdomain "github.com/tumlumtala/gateway/internal/domain/user"
	apperrors "github.com/tumlumtala/gateway/internal/shared/errors"
	"google.golang.org/grpc"
)

type UserClient interface {
	CreateUser(context.Context, userdomain.CreateUserInput) (userdomain.User, error)
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

func (c *userClient) CreateUser(ctx context.Context, input userdomain.CreateUserInput) (userdomain.User, error) {
	response, err := c.client.CreateUser(ctx, &userpb.CreateUserRequest{
		Email:    input.Email,
		Password: input.Password,
		Fullname: input.Fullname,
	})
	if err != nil {
		return userdomain.User{}, apperrors.FromGRPC(err)
	}
	return userdomain.User{
		ID:       response.GetId(),
		Email:    response.GetEmail(),
		Fullname: response.GetFullname(),
	}, nil
}

func (c *userClient) GetMe(_ context.Context, _ string) (map[string]any, error) {
	return nil, apperrors.New(apperrors.CodeUnavailable, "UserService.GetMe contract is not generated yet", nil)
}
