package eventhandler

import (
	"context"
	"errors"
	"fmt"
)

var ErrInvalidPayload = errors.New("invalid event payload")

type HandlerFunc func(ctx context.Context, body []byte) error

type EventHandler interface {
	Handle(ctx context.Context, routingKey string, body []byte) error
}

type Router struct {
	handlers map[string]HandlerFunc
}

// NewRouter tạo event router rỗng; application wiring sẽ register từng handler theo routing key.
func NewRouter() *Router {
	return &Router{handlers: make(map[string]HandlerFunc)}
}

// Register gắn một routing key với handler tương ứng để tránh gom logic vào switch lớn.
func (r *Router) Register(routingKey string, handler HandlerFunc) {
	if routingKey == "" || handler == nil {
		return
	}
	r.handlers[routingKey] = handler
}

// Handle tìm handler theo routing key; event chưa đăng ký được bỏ qua để consumer không retry vô ích.
func (r *Router) Handle(ctx context.Context, routingKey string, body []byte) error {
	handler, ok := r.handlers[routingKey]
	if !ok {
		return nil
	}
	if err := handler(ctx, body); err != nil {
		return fmt.Errorf("handle event %s: %w", routingKey, err)
	}
	return nil
}
