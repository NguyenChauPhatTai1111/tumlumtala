package message

import (
	"context"

	messageDTO "github.com/tumlumtala/messenger-service/internal/application/dto/message"
	queryservice "github.com/tumlumtala/messenger-service/internal/application/query"
	domainerrors "github.com/tumlumtala/messenger-service/internal/domain/errors"
	"github.com/tumlumtala/messenger-service/internal/domain/repository"
)

type RemoveReactionUseCase struct {
	messageRepo    repository.UserMessageRepository
	messageQS      queryservice.UserMessageQueryService
	conversationQS queryservice.UserConversationQueryService
}

func NewRemoveReactionUseCase(
	messageRepo repository.UserMessageRepository,
	conversationQS queryservice.UserConversationQueryService,
	messageQS queryservice.UserMessageQueryService,
) *RemoveReactionUseCase {
	return &RemoveReactionUseCase{messageRepo: messageRepo, conversationQS: conversationQS, messageQS: messageQS}
}

func (uc *RemoveReactionUseCase) Execute(ctx context.Context, input messageDTO.RemoveReactionInput) (*messageDTO.RemoveReactionOutput, error) {
	msg, err := uc.messageQS.GetMessageByID(ctx, input.MessageID)
	if err != nil {
		return nil, err
	}
	if msg == nil {
		return nil, domainerrors.ErrInvalidMessageID
	}
	ok, err := uc.conversationQS.IsParticipant(ctx, msg.ConversationID, input.UserID)
	if err != nil {
		return nil, err
	}
	if !ok {
		return nil, domainerrors.ErrNotInConversation
	}
	if err := uc.messageRepo.RemoveReaction(ctx, input.MessageID, input.UserID); err != nil {
		return nil, domainerrors.ErrRemoveReaction
	}
	return &messageDTO.RemoveReactionOutput{
		MessageID:      input.MessageID,
		ConversationID: msg.ConversationID,
		UserID:         input.UserID,
	}, nil
}
