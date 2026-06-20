package grpcclient

import (
	"context"

	"google.golang.org/grpc"
)

type CourseClient interface {
	Health(context.Context) error
}

type courseClient struct {
	conn *grpc.ClientConn
}

func NewCourseClient(conn *grpc.ClientConn) CourseClient {
	return &courseClient{conn: conn}
}

func (c *courseClient) Health(context.Context) error {
	return nil
}
