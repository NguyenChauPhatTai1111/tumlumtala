package processor

import (
	"context"

	"tumlumtala/notification-service/internal/modules/notification/domain"

	"github.com/rs/zerolog"
)

type AlertProvider struct {
	log zerolog.Logger
}

func NewAlertProvider(log zerolog.Logger) *AlertProvider {
	return &AlertProvider{log: log}
}

func (p *AlertProvider) Send(_ context.Context, notification domain.Notification) error {
	p.log.Warn().
		Str("notification_id", notification.ID).
		Str("recipient", notification.Recipient).
		Str("type", notification.Type).
		Str("message", notification.Message).
		Msg("alert notification")
	return nil
}
