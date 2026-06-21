package grpcclient

import (
	"context"
	"errors"
	"fmt"

	"github.com/rs/zerolog"
	authpb "github.com/tumlumtala/contracts/generated/auth"
	authzpb "github.com/tumlumtala/contracts/generated/authorization"
	userpb "github.com/tumlumtala/contracts/generated/user"
	"google.golang.org/grpc"
)

type Registry struct {
	Clients *Clients

	AuthConn          *grpc.ClientConn
	AuthorizationConn *grpc.ClientConn
	UserConn          *grpc.ClientConn
	CourseConn        *grpc.ClientConn
	OrderConn         *grpc.ClientConn
}

func NewRegistry(parent context.Context, cfg Config, logger zerolog.Logger) (*Registry, error) {
	ctx, cancel := context.WithTimeout(parent, cfg.ConnectTimeout)
	defer cancel()

	registry := &Registry{Clients: &Clients{}}
	var setupErr error
	defer func() {
		if setupErr != nil {
			_ = registry.Close()
		}
	}()

	if cfg.Auth.Enabled {
		registry.AuthConn, setupErr = NewConnection(ctx, AuthService, cfg.Auth.Target, cfg, logger)
		if setupErr != nil {
			return nil, setupErr
		}
		registry.Clients.Auth = authpb.NewAuthServiceClient(registry.AuthConn)
	}

	if cfg.Authorization.Enabled {
		registry.AuthorizationConn, setupErr = NewConnection(ctx, AuthorizationService, cfg.Authorization.Target, cfg, logger)
		if setupErr != nil {
			return nil, setupErr
		}
		registry.Clients.Authorization = authzpb.NewAuthorizationServiceClient(registry.AuthorizationConn)
	}

	if cfg.User.Enabled {
		registry.UserConn, setupErr = NewConnection(ctx, UserService, cfg.User.Target, cfg, logger)
		if setupErr != nil {
			return nil, setupErr
		}
		registry.Clients.User = userpb.NewUserServiceClient(registry.UserConn)
	}

	if cfg.Course.Enabled {
		registry.CourseConn, setupErr = NewConnection(ctx, CourseService, cfg.Course.Target, cfg, logger)
		if setupErr != nil {
			return nil, setupErr
		}
		registry.Clients.Course = registry.CourseConn
	}

	if cfg.Order.Enabled {
		registry.OrderConn, setupErr = NewConnection(ctx, OrderService, cfg.Order.Target, cfg, logger)
		if setupErr != nil {
			return nil, setupErr
		}
		registry.Clients.Order = registry.OrderConn
	}

	return registry, nil
}

func (r *Registry) Close() error {
	if r == nil {
		return nil
	}

	var errs []error
	closeConn := func(name ServiceName, conn *grpc.ClientConn) {
		if conn == nil {
			return
		}
		if err := conn.Close(); err != nil {
			errs = append(errs, fmt.Errorf("close %s connection: %w", name, err))
		}
	}

	closeConn(AuthService, r.AuthConn)
	closeConn(AuthorizationService, r.AuthorizationConn)
	closeConn(UserService, r.UserConn)
	closeConn(CourseService, r.CourseConn)
	closeConn(OrderService, r.OrderConn)

	return errors.Join(errs...)
}
