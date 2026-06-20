package grpc

import (
	"context"
	"errors"

	userpb "github.com/tumlumtala/contracts/generated/user"
	"github.com/tumlumtala/users-service/internal/application/dto"
	"github.com/tumlumtala/users-service/internal/application/usecase"
	domainerrors "github.com/tumlumtala/users-service/internal/domain/errors"
	grpcCodes "google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type UserController struct {
	userpb.UnimplementedUserServiceServer
	create *usecase.CreateUserUseCase
	get    *usecase.GetUserUseCase
	list   *usecase.ListUsersUseCase
	update *usecase.UpdateUserUseCase
	delete *usecase.DeleteUserUseCase
}

func NewUserController(create *usecase.CreateUserUseCase, get *usecase.GetUserUseCase, list *usecase.ListUsersUseCase, update *usecase.UpdateUserUseCase, deleteUC *usecase.DeleteUserUseCase) *UserController {
	return &UserController{create: create, get: get, list: list, update: update, delete: deleteUC}
}

func mapError(err error) error {
	switch {
	case errors.Is(err, domainerrors.ErrInvalidInput):
		return status.Error(grpcCodes.InvalidArgument, err.Error())
	case errors.Is(err, domainerrors.ErrNotFound):
		return status.Error(grpcCodes.NotFound, err.Error())
	case errors.Is(err, domainerrors.ErrEmailExists):
		return status.Error(grpcCodes.AlreadyExists, err.Error())
	default:
		return status.Error(grpcCodes.Internal, "internal server error")
	}
}

func toProto(user *dto.UserDTO) *userpb.User {
	return &userpb.User{Id: user.ID, Email: user.Email, Fullname: user.Fullname, Role: user.Role, CreatedAt: user.CreatedAt.Format("2006-01-02T15:04:05.999999999Z07:00"), UpdatedAt: user.UpdatedAt.Format("2006-01-02T15:04:05.999999999Z07:00")}
}

func (c *UserController) CreateUser(ctx context.Context, req *userpb.CreateUserRequest) (*userpb.CreateUserResponse, error) {
	user, err := c.create.Execute(ctx, dto.CreateUserInput{Email: req.GetEmail(), Password: req.GetPassword(), Fullname: req.GetFullname(), Role: req.GetRole()})
	if err != nil {
		return nil, mapError(err)
	}
	return &userpb.CreateUserResponse{Id: user.ID, Email: user.Email, Fullname: user.Fullname, Role: user.Role}, nil
}

func (c *UserController) GetUser(ctx context.Context, req *userpb.GetUserRequest) (*userpb.User, error) {
	user, err := c.get.Execute(ctx, req.GetId())
	if err != nil {
		return nil, mapError(err)
	}
	return toProto(user), nil
}

func (c *UserController) ListUsers(ctx context.Context, req *userpb.ListUsersRequest) (*userpb.ListUsersResponse, error) {
	result, err := c.list.Execute(ctx, req.GetLimit(), req.GetOffset())
	if err != nil {
		return nil, mapError(err)
	}
	users := make([]*userpb.User, 0, len(result.Users))
	for i := range result.Users {
		users = append(users, toProto(&result.Users[i]))
	}
	return &userpb.ListUsersResponse{Users: users, Total: result.Total}, nil
}

func (c *UserController) UpdateUser(ctx context.Context, req *userpb.UpdateUserRequest) (*userpb.User, error) {
	user, err := c.update.Execute(ctx, dto.UpdateUserInput{ID: req.GetId(), Email: req.GetEmail(), Fullname: req.GetFullname(), Role: req.GetRole()})
	if err != nil {
		return nil, mapError(err)
	}
	return toProto(user), nil
}

func (c *UserController) DeleteUser(ctx context.Context, req *userpb.DeleteUserRequest) (*userpb.DeleteUserResponse, error) {
	if err := c.delete.Execute(ctx, req.GetId()); err != nil {
		return nil, mapError(err)
	}
	return &userpb.DeleteUserResponse{Deleted: true}, nil
}
