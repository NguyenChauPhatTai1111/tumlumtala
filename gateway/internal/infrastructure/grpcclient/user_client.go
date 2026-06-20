package grpcclient

import (
	"context"

	userpb "github.com/tumlumtala/contracts/generated/user"
	apperrors "github.com/tumlumtala/gateway/internal/shared/errors"
	"google.golang.org/grpc"
)

type UserClient interface {
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

func (c *userClient) GetMe(_ context.Context, _ string) (map[string]any, error) {
	return nil, apperrors.New(apperrors.CodeUnavailable, "UserService.GetMe contract is not generated yet", nil)
}
