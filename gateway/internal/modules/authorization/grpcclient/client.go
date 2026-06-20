package grpcclient

import (
	"context"

	authzpb "github.com/tumlumtala/contracts/generated/authorization"
)

type AuthorizationClient struct {
	client authzpb.AuthorizationServiceClient
}

func NewAuthorizationClient(client authzpb.AuthorizationServiceClient) *AuthorizationClient {
	return &AuthorizationClient{client: client}
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
