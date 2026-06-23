package usecase

import "context"

type DomainEventPublisher interface {
	Publish(ctx context.Context, routingKey string, payload any) error
}
