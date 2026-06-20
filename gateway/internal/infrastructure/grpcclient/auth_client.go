package grpcclient

import (
	"context"

	authpb "github.com/tumlumtala/contracts/generated/auth"
	authdomain "github.com/tumlumtala/gateway/internal/domain/auth"
	apperrors "github.com/tumlumtala/gateway/internal/shared/errors"
	"google.golang.org/grpc"
	"google.golang.org/protobuf/types/known/emptypb"
)

const (
	refreshTokenMethod = "/auth.AuthService/RefreshToken"
	logoutMethod       = "/auth.AuthService/Logout"
)

type AuthClient interface {
	Login(context.Context, authdomain.LoginInput) (authdomain.TokenPair, error)
	RefreshToken(context.Context, authdomain.RefreshInput) (authdomain.TokenPair, error)
	Logout(context.Context, authdomain.LogoutInput) error
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

func (c *authClient) Login(ctx context.Context, input authdomain.LoginInput) (authdomain.TokenPair, error) {
	response, err := c.client.Login(ctx, &authpb.LoginRequest{
		Email:    input.Email,
		Password: input.Password,
	})
	if err != nil {
		return authdomain.TokenPair{}, apperrors.FromGRPC(err)
	}
	return authdomain.TokenPair{
		AccessToken:  response.GetAccessToken(),
		RefreshToken: response.GetRefreshToken(),
	}, nil
}

func (c *authClient) RefreshToken(ctx context.Context, input authdomain.RefreshInput) (authdomain.TokenPair, error) {
	request := &authpb.LoginRequest{Email: input.RefreshToken}
	response := &authpb.LoginResponse{}
	if err := c.conn.Invoke(ctx, refreshTokenMethod, request, response); err != nil {
		return authdomain.TokenPair{}, apperrors.FromGRPC(err)
	}
	return authdomain.TokenPair{
		AccessToken:  response.GetAccessToken(),
		RefreshToken: response.GetRefreshToken(),
	}, nil
}

func (c *authClient) Logout(ctx context.Context, input authdomain.LogoutInput) error {
	request := &authpb.LoginRequest{Email: input.RefreshToken}
	response := &emptypb.Empty{}
	if err := c.conn.Invoke(ctx, logoutMethod, request, response); err != nil {
		return apperrors.FromGRPC(err)
	}
	return nil
}
