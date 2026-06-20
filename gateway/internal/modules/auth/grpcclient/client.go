package grpcclient

import (
	"context"

	authpb "github.com/tumlumtala/contracts/generated/auth"
	"github.com/tumlumtala/gateway/internal/modules/auth/domain"
	apperrors "github.com/tumlumtala/gateway/internal/shared/errors"
	"google.golang.org/grpc"
)

type AuthClient interface {
	Login(context.Context, domain.LoginInput) (domain.TokenPair, error)
	RefreshToken(context.Context, domain.RefreshInput) (domain.TokenPair, error)
	Logout(context.Context, domain.LogoutInput) error
}

type authClient struct {
	client authpb.AuthServiceClient
}

func NewAuthClient(conn *grpc.ClientConn) AuthClient {
	return &authClient{client: authpb.NewAuthServiceClient(conn)}
}

func (c *authClient) Login(ctx context.Context, input domain.LoginInput) (domain.TokenPair, error) {
	resp, err := c.client.Login(ctx, &authpb.LoginRequest{
		Email:    input.Email,
		Password: input.Password,
	})
	if err != nil {
		return domain.TokenPair{}, apperrors.FromGRPC(err)
	}
	return domain.TokenPair{
		AccessToken:  resp.GetAccessToken(),
		RefreshToken: resp.GetRefreshToken(),
	}, nil
}

func (c *authClient) RefreshToken(ctx context.Context, input domain.RefreshInput) (domain.TokenPair, error) {
	resp, err := c.client.RefreshToken(ctx, &authpb.RefreshTokenRequest{
		RefreshToken: input.RefreshToken,
	})
	if err != nil {
		return domain.TokenPair{}, apperrors.FromGRPC(err)
	}
	return domain.TokenPair{
		AccessToken:  resp.GetAccessToken(),
		RefreshToken: resp.GetRefreshToken(),
	}, nil
}

func (c *authClient) Logout(ctx context.Context, input domain.LogoutInput) error {
	if _, err := c.client.Logout(ctx, &authpb.LogoutRequest{
		RefreshToken: input.RefreshToken,
	}); err != nil {
		return apperrors.FromGRPC(err)
	}
	return nil
}
