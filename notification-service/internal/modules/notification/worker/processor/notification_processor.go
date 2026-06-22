package processor

import (
	"context"
	"fmt"

	"tumlumtala/notification-service/internal/modules/notification/domain"
)

type NotificationProcessor struct {
	factory domain.ProviderFactory
}

func NewNotificationProcessor(factory domain.ProviderFactory) *NotificationProcessor {
	return &NotificationProcessor{factory: factory}
}

func (p *NotificationProcessor) Process(ctx context.Context, notification domain.Notification) error {
	provider, err := p.factory.Provider(notification.Channel)
	if err != nil {
		return err
	}
	if err := provider.Send(ctx, notification); err != nil {
		return fmt.Errorf("send %s notification: %w", notification.Channel, err)
	}
	return nil
}
