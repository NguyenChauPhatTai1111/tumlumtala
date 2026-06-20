package grpcclient

import (
	"context"

	"google.golang.org/grpc"
)

type OrderClient interface {
	Health(context.Context) error
}

type orderClient struct {
	conn *grpc.ClientConn
}

func NewOrderClient(conn *grpc.ClientConn) OrderClient {
	return &orderClient{conn: conn}
}

func (c *orderClient) Health(context.Context) error {
	return nil
}
