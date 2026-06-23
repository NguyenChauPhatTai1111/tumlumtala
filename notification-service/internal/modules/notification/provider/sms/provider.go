package sms

import (
	"context"
	"fmt"

	"tumlumtala/notification-service/internal/modules/notification/domain"
)

type Provider struct{}

func New() *Provider {
	return &Provider{}
}

func (p *Provider) Send(_ context.Context, _ domain.Notification) error {
	return fmt.Errorf("sms provider is not configured")
}
