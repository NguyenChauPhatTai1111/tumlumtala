package grpcclient

import (
	"context"

	authpb "github.com/tumlumtala/contracts/generated/auth"
	authdomain "github.com/tumlumtala/gateway/internal/domain/auth"
	apperrors "github.com/tumlumtala/gateway/internal/shared/errors"
	"google.golang.org/grpc"
)

type AuthClient interface {
	Login(context.Context, authdomain.LoginInput) (authdomain.TokenPair, error)
	RefreshToken(context.Context, authdomain.RefreshInput) (authdomain.TokenPair, error)
	Logout(context.Context, authdomain.LogoutInput) error
}

type authClient struct {
	client authpb.AuthServiceClient
}

func NewAuthClient(conn *grpc.ClientConn) AuthClient {
	return &authClient{client: authpb.NewAuthServiceClient(conn)}
}

func (c *authClient) Login(ctx context.Context, input authdomain.LoginInput) (authdomain.TokenPair, error) {
	resp, err := c.client.Login(ctx, &authpb.LoginRequest{
		Email:    input.Email,
		Password: input.Password,
	})
	if err != nil {
		return authdomain.TokenPair{}, apperrors.FromGRPC(err)
	}
	return authdomain.TokenPair{
		AccessToken:  resp.GetAccessToken(),
		RefreshToken: resp.GetRefreshToken(),
	}, nil
}

func (c *authClient) RefreshToken(ctx context.Context, input authdomain.RefreshInput) (authdomain.TokenPair, error) {
	resp, err := c.client.RefreshToken(ctx, &authpb.RefreshTokenRequest{
		RefreshToken: input.RefreshToken,
	})
	if err != nil {
		return authdomain.TokenPair{}, apperrors.FromGRPC(err)
	}
	return authdomain.TokenPair{
		AccessToken:  resp.GetAccessToken(),
		RefreshToken: resp.GetRefreshToken(),
	}, nil
}

func (c *authClient) Logout(ctx context.Context, input authdomain.LogoutInput) error {
	if _, err := c.client.Logout(ctx, &authpb.LogoutRequest{
		RefreshToken: input.RefreshToken,
	}); err != nil {
		return apperrors.FromGRPC(err)
	}
	return nil
}
