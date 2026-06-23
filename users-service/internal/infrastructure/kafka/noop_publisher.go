package kafka

import "context"

// NoopPublisher discards all events — used in seeder/test contexts.
type NoopPublisher struct{}

func (NoopPublisher) PublishUserCreated(_ context.Context, _ uint64, _, _, _, _, _ string) error {
	return nil
}
func (NoopPublisher) PublishUserUpdated(_ context.Context, _ uint64, _, _, _, _, _ string) error {
	return nil
}
func (NoopPublisher) PublishUserDeleted(_ context.Context, _ uint64, _ string) error { return nil }
