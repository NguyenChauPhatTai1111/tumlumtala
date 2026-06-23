package eventhandler

import (
	"context"
	"encoding/json"
	"fmt"

	contractevents "github.com/tumlumtala/contracts/events"
	"tumlumtala/notification-service/internal/modules/notification/domain"
	"tumlumtala/notification-service/internal/modules/notification/usecase"
)

type UserCreatedHandler struct {
	notificationUseCase *usecase.SendNotificationUseCase
}

// NewUserCreatedHandler tạo handler riêng cho event user.created.
func NewUserCreatedHandler(notificationUseCase *usecase.SendNotificationUseCase) *UserCreatedHandler {
	return &UserCreatedHandler{notificationUseCase: notificationUseCase}
}

// Handle parse event user.created và tạo command gửi welcome email.
func (h *UserCreatedHandler) Handle(ctx context.Context, body []byte) error {
	var event contractevents.UserCreatedEvent
	if err := json.Unmarshal(body, &event); err != nil {
		return fmt.Errorf("%w: %v", ErrInvalidPayload, err)
	}

	// Command này đi qua SendNotificationUseCase để flow gửi mail vẫn dùng queue/provider factory hiện tại.
	cmd := usecase.SendNotificationInput{
		Channel:   domain.ChannelEmail,
		Type:      "user_created",
		Recipient: event.Email,
		Template:  "welcome_user",
		Subject:   "Welcome to Tumlumtala",
		Data: map[string]string{
			"fullname": event.Fullname,
			"email":    event.Email,
		},
		Metadata: map[string]string{
			"event":   "user.created",
			"user_id": event.UUID,
		},
	}

	_, err := h.notificationUseCase.Execute(ctx, cmd)
	return err
}
