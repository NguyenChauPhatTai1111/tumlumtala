package repository

import "context"

// EventPublisher publishes domain events to an external message broker.
type EventPublisher interface {
	PublishUserCreated(ctx context.Context, userID uint64, uuid, email, fullname, role string) error
	PublishUserUpdated(ctx context.Context, userID uint64, uuid, email, fullname, role string) error
	PublishUserDeleted(ctx context.Context, userID uint64, uuid string) error
}
