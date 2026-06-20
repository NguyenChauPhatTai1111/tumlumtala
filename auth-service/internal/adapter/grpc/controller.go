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
	login   *usecase.LoginUseCase
	refresh *usecase.RefreshTokenUseCase
	logout  *usecase.LogoutUseCase
}

func NewAuthController(
	login *usecase.LoginUseCase,
	refresh *usecase.RefreshTokenUseCase,
	logout *usecase.LogoutUseCase,
) *AuthController {
	return &AuthController{login: login, refresh: refresh, logout: logout}
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
