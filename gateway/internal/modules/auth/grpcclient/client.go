package grpcclient

import (
	"context"

	authpb "github.com/tumlumtala/contracts/generated/auth"
	"github.com/tumlumtala/gateway/internal/modules/auth/domain"
	apperrors "github.com/tumlumtala/gateway/internal/shared/errors"
	"google.golang.org/grpc"
	"google.golang.org/protobuf/types/known/emptypb"
)

const (
	refreshTokenMethod = "/auth.AuthService/RefreshToken"
	logoutMethod       = "/auth.AuthService/Logout"
)

type AuthClient interface {
	Login(context.Context, domain.LoginInput) (domain.TokenPair, error)
	RefreshToken(context.Context, domain.RefreshInput) (domain.TokenPair, error)
	Logout(context.Context, domain.LogoutInput) error
}

type authClient struct {
	conn   *grpc.ClientConn
	client authpb.AuthServiceClient
}

func NewAuthClient(conn *grpc.ClientConn) AuthClient {
	return &authClient{
		conn:   conn,
		client: authpb.NewAuthServiceClient(conn),
	}
}

func (c *authClient) Login(ctx context.Context, input domain.LoginInput) (domain.TokenPair, error) {
	response, err := c.client.Login(ctx, &authpb.LoginRequest{
		Email:    input.Email,
		Password: input.Password,
	})
	if err != nil {
		return domain.TokenPair{}, apperrors.FromGRPC(err)
	}
	return domain.TokenPair{
		AccessToken:  response.GetAccessToken(),
		RefreshToken: response.GetRefreshToken(),
	}, nil
}

func (c *authClient) RefreshToken(ctx context.Context, input domain.RefreshInput) (domain.TokenPair, error) {
	request := &authpb.LoginRequest{Email: input.RefreshToken}
	response := &authpb.LoginResponse{}
	if err := c.conn.Invoke(ctx, refreshTokenMethod, request, response); err != nil {
		return domain.TokenPair{}, apperrors.FromGRPC(err)
	}
	return domain.TokenPair{
		AccessToken:  response.GetAccessToken(),
		RefreshToken: response.GetRefreshToken(),
	}, nil
}

func (c *authClient) Logout(ctx context.Context, input domain.LogoutInput) error {
	request := &authpb.LoginRequest{Email: input.RefreshToken}
	response := &emptypb.Empty{}
	if err := c.conn.Invoke(ctx, logoutMethod, request, response); err != nil {
		return apperrors.FromGRPC(err)
	}
	return nil
}
