package message

import (
	"context"
	"errors"
	"strings"
	"time"

	"gorm.io/gorm"

	messageDTO "github.com/tumlumtala/messenger-service/internal/application/dto/message"
	queryservice "github.com/tumlumtala/messenger-service/internal/application/query"
	"github.com/tumlumtala/messenger-service/internal/domain/entity"
	domainerrors "github.com/tumlumtala/messenger-service/internal/domain/errors"
	"github.com/tumlumtala/messenger-service/internal/domain/repository"
)

type UpdateMessageUseCase struct {
	messageRepo      repository.UserMessageRepository
	conversationRepo repository.UserConversationRepository
	historyRepo      repository.UserMessageHistoryRepository
	messageQS        queryservice.UserMessageQueryService
}

func NewUpdateMessageUseCase(
	messageRepo repository.UserMessageRepository,
	conversationRepo repository.UserConversationRepository,
	historyRepo repository.UserMessageHistoryRepository,
	messageQS queryservice.UserMessageQueryService,
) *UpdateMessageUseCase {
	return &UpdateMessageUseCase{messageRepo: messageRepo, conversationRepo: conversationRepo, historyRepo: historyRepo, messageQS: messageQS}
}

func (uc *UpdateMessageUseCase) Execute(ctx context.Context, input messageDTO.UpdateMessageInput) (*messageDTO.UpdateMessageOutput, error) {
	if input.MessageID == 0 || input.UserID == 0 {
		return nil, domainerrors.ErrInvalidMessageID
	}
	trimmed := strings.TrimSpace(input.Content)
	if trimmed == "" {
		return nil, domainerrors.ErrEmptyMessageContent
	}
	msg, err := uc.messageQS.GetMessageByID(ctx, input.MessageID)
	if err != nil {
		return nil, err
	}
	if msg == nil {
		return nil, domainerrors.ErrInvalidMessageID
	}
	if msg.SenderID != input.UserID {
		return nil, domainerrors.ErrNotMessageOwner
	}
	if trimmed == strings.TrimSpace(msg.Content) {
		return nil, domainerrors.ErrNoChangeMessage
	}
	now := time.Now()
	if err := uc.historyRepo.AddMessageHistory(ctx, &entity.UserMessageHistory{
		MessageID: msg.ID,
		EditedBy:  input.UserID,
		Content:   msg.Content,
		EditedAt:  &now,
	}); err != nil {
		return nil, domainerrors.ErrUpdateMessage
	}
	updated, err := uc.messageRepo.UpdateMessage(ctx, input.MessageID, trimmed)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, domainerrors.ErrInvalidMessageID
		}
		return nil, domainerrors.ErrUpdateMessage
	}
	if err := uc.conversationRepo.UpdateLastMessageContent(ctx, updated.ConversationID, updated.ID, updated.Content); err != nil {
		return nil, domainerrors.ErrUpdateMessage
	}
	return &messageDTO.UpdateMessageOutput{
		ID:             updated.ID,
		ConversationID: updated.ConversationID,
		Seq:            updated.ID,
		SenderID:       updated.SenderID,
		SenderName:     updated.SenderName,
		Content:        updated.Content,
		UpdatedAt:      updated.UpdatedAt.Format(time.RFC3339),
	}, nil
}
