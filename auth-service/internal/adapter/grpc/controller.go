package grpc

import (
	"context"
	"errors"

	authpb "github.com/tumlumtala/contracts/generated/auth"
	"github.com/tumlumtala/auth-service/internal/application/dto"
	"github.com/tumlumtala/auth-service/internal/application/usecase"
	domainerrors "github.com/tumlumtala/auth-service/internal/domain/errors"
	grpccodes "google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type AuthController struct {
	authpb.UnimplementedAuthServiceServer
	login              *usecase.LoginUseCase
	refresh            *usecase.RefreshTokenUseCase
	logout             *usecase.LogoutUseCase
	webAuthnRegister   *usecase.WebAuthnRegistrationUseCase
	webAuthnLogin      *usecase.WebAuthnLoginUseCase
}

func NewAuthController(
	login *usecase.LoginUseCase,
	refresh *usecase.RefreshTokenUseCase,
	logout *usecase.LogoutUseCase,
	webAuthnRegister *usecase.WebAuthnRegistrationUseCase,
	webAuthnLogin *usecase.WebAuthnLoginUseCase,
) *AuthController {
	return &AuthController{
		login:            login,
		refresh:          refresh,
		logout:           logout,
		webAuthnRegister: webAuthnRegister,
		webAuthnLogin:    webAuthnLogin,
	}
}

func mapError(err error) error {
	switch {
	case errors.Is(err, domainerrors.ErrInvalidInput):
		return status.Error(grpccodes.InvalidArgument, err.Error())
	case errors.Is(err, domainerrors.ErrInvalidCredentials):
		return status.Error(grpccodes.Unauthenticated, err.Error())
	case errors.Is(err, domainerrors.ErrInvalidToken):
		return status.Error(grpccodes.Unauthenticated, err.Error())
	case errors.Is(err, domainerrors.ErrSessionNotFound):
		return status.Error(grpccodes.NotFound, err.Error())
	default:
		return status.Error(grpccodes.Internal, "internal server error")
	}
}

func (c *AuthController) Login(ctx context.Context, req *authpb.LoginRequest) (*authpb.LoginResponse, error) {
	pair, err := c.login.Execute(ctx, dto.LoginInput{
		Email:    req.GetEmail(),
		Password: req.GetPassword(),
	})
	if err != nil {
		return nil, mapError(err)
	}
	return &authpb.LoginResponse{
		AccessToken:  pair.AccessToken,
		RefreshToken: pair.RefreshToken,
	}, nil
}

func (c *AuthController) RefreshToken(ctx context.Context, req *authpb.RefreshTokenRequest) (*authpb.LoginResponse, error) {
	pair, err := c.refresh.Execute(ctx, dto.RefreshInput{
		RefreshToken: req.GetRefreshToken(),
	})
	if err != nil {
		return nil, mapError(err)
	}
	return &authpb.LoginResponse{
		AccessToken:  pair.AccessToken,
		RefreshToken: pair.RefreshToken,
	}, nil
}

func (c *AuthController) Logout(ctx context.Context, req *authpb.LogoutRequest) (*authpb.LogoutResponse, error) {
	if err := c.logout.Execute(ctx, dto.LogoutInput{
		RefreshToken: req.GetRefreshToken(),
	}); err != nil {
		return nil, mapError(err)
	}
	return &authpb.LogoutResponse{Success: true}, nil
}

func (c *AuthController) WebAuthnBeginRegistration(ctx context.Context, req *authpb.WebAuthnBeginRegistrationRequest) (*authpb.WebAuthnBeginRegistrationResponse, error) {
	out, err := c.webAuthnRegister.Begin(ctx, dto.WebAuthnBeginRegistrationInput{
		UserUUID:  req.GetUserUuid(),
		SessionID: req.GetSessionId(),
	})
	if err != nil {
		return nil, mapError(err)
	}
	return &authpb.WebAuthnBeginRegistrationResponse{OptionsJson: out.OptionsJSON}, nil
}

func (c *AuthController) WebAuthnFinishRegistration(ctx context.Context, req *authpb.WebAuthnFinishRegistrationRequest) (*authpb.WebAuthnFinishRegistrationResponse, error) {
	err := c.webAuthnRegister.Finish(ctx, dto.WebAuthnFinishRegistrationInput{
		UserUUID:        req.GetUserUuid(),
		SessionID:       req.GetSessionId(),
		RawResponseJSON: req.GetRawResponseJson(),
	})
	if err != nil {
		return nil, mapError(err)
	}
	return &authpb.WebAuthnFinishRegistrationResponse{Success: true}, nil
}

func (c *AuthController) WebAuthnBeginLogin(ctx context.Context, req *authpb.WebAuthnBeginLoginRequest) (*authpb.WebAuthnBeginLoginResponse, error) {
	out, err := c.webAuthnLogin.Begin(ctx, dto.WebAuthnBeginLoginInput{
		Email:     req.GetEmail(),
		SessionID: req.GetSessionId(),
	})
	if err != nil {
		return nil, mapError(err)
	}
	return &authpb.WebAuthnBeginLoginResponse{OptionsJson: out.OptionsJSON}, nil
}

func (c *AuthController) WebAuthnFinishLogin(ctx context.Context, req *authpb.WebAuthnFinishLoginRequest) (*authpb.LoginResponse, error) {
	pair, err := c.webAuthnLogin.Finish(ctx, dto.WebAuthnFinishLoginInput{
		Email:           req.GetEmail(),
		SessionID:       req.GetSessionId(),
		RawResponseJSON: req.GetRawResponseJson(),
	})
	if err != nil {
		return nil, mapError(err)
	}
	return &authpb.LoginResponse{
		AccessToken:  pair.AccessToken,
		RefreshToken: pair.RefreshToken,
	}, nil
}
