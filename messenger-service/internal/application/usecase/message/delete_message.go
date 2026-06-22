package message

import (
	"context"
	"errors"

	"gorm.io/gorm"

	queryservice "github.com/tumlumtala/messenger-service/internal/application/query"
	domainerrors "github.com/tumlumtala/messenger-service/internal/domain/errors"
	"github.com/tumlumtala/messenger-service/internal/domain/repository"
)

type DeleteMessageUseCase struct {
	repo      repository.UserMessageRepository
	messageQS queryservice.UserMessageQueryService
}

func NewDeleteMessageUseCase(repo repository.UserMessageRepository, messageQS queryservice.UserMessageQueryService) *DeleteMessageUseCase {
	return &DeleteMessageUseCase{repo: repo, messageQS: messageQS}
}

func (uc *DeleteMessageUseCase) Execute(ctx context.Context, messageID, senderID uint) (uint, error) {
	if messageID == 0 || senderID == 0 {
		return 0, domainerrors.ErrInvalidMessageID
	}
	msg, err := uc.messageQS.GetMessageByID(ctx, messageID)
	if err != nil {
		return 0, err
	}
	if err := uc.repo.DeleteMessage(ctx, messageID, senderID); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return 0, domainerrors.ErrInvalidMessageID
		}
		return 0, err
	}
	return msg.ConversationID, nil
}
