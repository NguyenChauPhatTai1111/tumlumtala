package domain

import "context"

type Publisher interface {
	Publish(ctx context.Context, notification Notification) error
	Close() error
}

type Provider interface {
	Send(ctx context.Context, notification Notification) error
}

type ProviderFactory interface {
	Provider(channel Channel) (Provider, error)
}
