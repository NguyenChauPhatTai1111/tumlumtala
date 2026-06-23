package usecase

import (
	"context"
	"errors"
	"strings"
	"time"

	"tumlumtala/notification-service/internal/modules/notification/domain"
	"tumlumtala/notification-service/internal/shared/id"
)

type SendNotificationInput struct {
	Channel   domain.Channel    `json:"channel" binding:"required"`
	Type      string            `json:"type"`
	Recipient string            `json:"recipient" binding:"required"`
	Subject   string            `json:"subject"`
	Message   string            `json:"message"`
	Template  string            `json:"template"`
	Data      map[string]string `json:"data"`
	Metadata  map[string]string `json:"metadata"`
}

type SendNotificationUseCase struct {
	publisher domain.Publisher
}

func NewSendNotificationUseCase(publisher domain.Publisher) *SendNotificationUseCase {
	return &SendNotificationUseCase{publisher: publisher}
}

func (uc *SendNotificationUseCase) Execute(ctx context.Context, input SendNotificationInput) (domain.Notification, error) {
	notification := domain.Notification{
		ID:        id.New(),
		Channel:   input.Channel,
		Type:      strings.TrimSpace(input.Type),
		Recipient: strings.TrimSpace(input.Recipient),
		Subject:   strings.TrimSpace(input.Subject),
		Message:   strings.TrimSpace(input.Message),
		Template:  strings.TrimSpace(input.Template),
		Data:      input.Data,
		Metadata:  input.Metadata,
		CreatedAt: time.Now().UTC(),
	}

	if notification.Channel == "" {
		return domain.Notification{}, errors.New("channel is required")
	}
	if notification.Recipient == "" {
		return domain.Notification{}, errors.New("recipient is required")
	}
	if notification.Message == "" && notification.Template == "" {
		return domain.Notification{}, errors.New("message or template is required")
	}

	return notification, uc.publisher.Publish(ctx, notification)
}
