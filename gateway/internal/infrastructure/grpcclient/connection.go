package grpcclient

import (
	"fmt"
	"log/slog"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

type ServiceName string

const (
	AuthService          ServiceName = "auth"
	AuthorizationService ServiceName = "authorization"
	UserService          ServiceName = "user"
	CourseService        ServiceName = "course"
	OrderService         ServiceName = "order"
)

type ConnectionConfig struct {
	Service ServiceName
	Target  string
}

type Connections map[ServiceName]*grpc.ClientConn

func NewConnection(target string, logger *slog.Logger) (*grpc.ClientConn, error) {
	return grpc.NewClient(
		target,
		grpc.WithTransportCredentials(insecure.NewCredentials()),
		grpc.WithUnaryInterceptor(UnaryClientInterceptor(logger)),
	)
}

func NewConnections(configs []ConnectionConfig, logger *slog.Logger) (Connections, error) {
	connections := make(Connections, len(configs))

	for _, config := range configs {
		if _, exists := connections[config.Service]; exists {
			connections.Close()
			return nil, fmt.Errorf("duplicate gRPC service %q", config.Service)
		}

		connection, err := NewConnection(config.Target, logger)
		if err != nil {
			connections.Close()
			return nil, fmt.Errorf("connect %s service: %w", config.Service, err)
		}
		connections[config.Service] = connection
	}

	return connections, nil
}

func (connections Connections) Close() {
	for _, connection := range connections {
		_ = connection.Close()
	}
}
