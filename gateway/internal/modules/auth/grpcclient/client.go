package grpcclient

import (
	"context"

	authpb "github.com/tumlumtala/contracts/generated/auth"
	"github.com/tumlumtala/gateway/internal/modules/auth/domain"
	apperrors "github.com/tumlumtala/gateway/internal/shared/errors"
)

type AuthClient interface {
	Login(context.Context, domain.LoginInput) (domain.TokenPair, error)
	RefreshToken(context.Context, domain.RefreshInput) (domain.TokenPair, error)
	Logout(context.Context, domain.LogoutInput) error
	WebAuthnBeginRegistration(context.Context, domain.WebAuthnBeginRegistrationInput) (domain.WebAuthnBeginRegistrationOutput, error)
	WebAuthnFinishRegistration(context.Context, domain.WebAuthnFinishRegistrationInput) error
	WebAuthnBeginLogin(context.Context, domain.WebAuthnBeginLoginInput) (domain.WebAuthnBeginLoginOutput, error)
	WebAuthnFinishLogin(context.Context, domain.WebAuthnFinishLoginInput) (domain.TokenPair, error)
}

type authClient struct {
	client authpb.AuthServiceClient
}

func NewAuthClient(client authpb.AuthServiceClient) AuthClient {
	return &authClient{client: client}
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

func (c *authClient) WebAuthnBeginRegistration(ctx context.Context, input domain.WebAuthnBeginRegistrationInput) (domain.WebAuthnBeginRegistrationOutput, error) {
	resp, err := c.client.WebAuthnBeginRegistration(ctx, &authpb.WebAuthnBeginRegistrationRequest{
		UserUuid:  input.UserUUID,
		SessionId: input.SessionID,
	})
	if err != nil {
		return domain.WebAuthnBeginRegistrationOutput{}, apperrors.FromGRPC(err)
	}
	return domain.WebAuthnBeginRegistrationOutput{OptionsJSON: resp.GetOptionsJson()}, nil
}

func (c *authClient) WebAuthnFinishRegistration(ctx context.Context, input domain.WebAuthnFinishRegistrationInput) error {
	_, err := c.client.WebAuthnFinishRegistration(ctx, &authpb.WebAuthnFinishRegistrationRequest{
		UserUuid:        input.UserUUID,
		SessionId:       input.SessionID,
		RawResponseJson: input.RawResponseJSON,
	})
	if err != nil {
		return apperrors.FromGRPC(err)
	}
	return nil
}

func (c *authClient) WebAuthnBeginLogin(ctx context.Context, input domain.WebAuthnBeginLoginInput) (domain.WebAuthnBeginLoginOutput, error) {
	resp, err := c.client.WebAuthnBeginLogin(ctx, &authpb.WebAuthnBeginLoginRequest{
		Email:     input.Email,
		SessionId: input.SessionID,
	})
	if err != nil {
		return domain.WebAuthnBeginLoginOutput{}, apperrors.FromGRPC(err)
	}
	return domain.WebAuthnBeginLoginOutput{OptionsJSON: resp.GetOptionsJson()}, nil
}

func (c *authClient) WebAuthnFinishLogin(ctx context.Context, input domain.WebAuthnFinishLoginInput) (domain.TokenPair, error) {
	resp, err := c.client.WebAuthnFinishLogin(ctx, &authpb.WebAuthnFinishLoginRequest{
		Email:           input.Email,
		SessionId:       input.SessionID,
		RawResponseJson: input.RawResponseJSON,
	})
	if err != nil {
		return domain.TokenPair{}, apperrors.FromGRPC(err)
	}
	return domain.TokenPair{
		AccessToken:  resp.GetAccessToken(),
		RefreshToken: resp.GetRefreshToken(),
	}, nil
}
