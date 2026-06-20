package grpcclient

import (
	authpb "github.com/tumlumtala/contracts/generated/auth"
	authzpb "github.com/tumlumtala/contracts/generated/authorization"
	userpb "github.com/tumlumtala/contracts/generated/user"
	"google.golang.org/grpc"
)

type Clients struct {
	Auth          authpb.AuthServiceClient
	Authorization authzpb.AuthorizationServiceClient
	User          userpb.UserServiceClient
	Course        grpc.ClientConnInterface
	Order         grpc.ClientConnInterface
}
