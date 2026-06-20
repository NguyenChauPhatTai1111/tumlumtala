package grpcclient

import (
	"context"

	authzpb "github.com/tumlumtala/contracts/generated/authorization"
	"google.golang.org/grpc"
)

type AuthorizationClient struct {
	client authzpb.AuthorizationServiceClient
}

func NewAuthorizationClient(conn *grpc.ClientConn) *AuthorizationClient {
	return &AuthorizationClient{client: authzpb.NewAuthorizationServiceClient(conn)}
}

func (c *AuthorizationClient) Check(ctx context.Context, userUUID, service, resource, action string) (bool, string, error) {
	resp, err := c.client.Check(ctx, &authzpb.CheckRequest{
		UserUuid: userUUID,
		Service:  service,
		Resource: resource,
		Action:   action,
	})
	if err != nil {
		return false, "", err
	}
	return resp.GetAllowed(), resp.GetReason(), nil
}
