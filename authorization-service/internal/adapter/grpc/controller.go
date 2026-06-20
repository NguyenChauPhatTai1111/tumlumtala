package grpc

import (
	"context"

	authzpb "github.com/tumlumtala/contracts/generated/authorization"
	"github.com/tumlumtala/authorization-service/internal/application/usecase"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type AuthorizationController struct {
	authzpb.UnimplementedAuthorizationServiceServer
	checkUC *usecase.CheckUseCase
}

func NewAuthorizationController(checkUC *usecase.CheckUseCase) *AuthorizationController {
	return &AuthorizationController{checkUC: checkUC}
}

func (c *AuthorizationController) Check(ctx context.Context, req *authzpb.CheckRequest) (*authzpb.CheckResponse, error) {
	if req.GetUserUuid() == "" || req.GetResource() == "" || req.GetAction() == "" {
		return nil, status.Error(codes.InvalidArgument, "user_uuid, resource and action are required")
	}

	allowed, reason, err := c.checkUC.Execute(ctx, usecase.CheckInput{
		UserUUID: req.GetUserUuid(),
		Service:  req.GetService(),
		Resource: req.GetResource(),
		Action:   req.GetAction(),
	})
	if err != nil {
		return nil, status.Errorf(codes.Internal, "check failed: %v", err)
	}

	return &authzpb.CheckResponse{Allowed: allowed, Reason: reason}, nil
}
