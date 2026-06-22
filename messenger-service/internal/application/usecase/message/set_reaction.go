package message

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	messageDTO "github.com/tumlumtala/messenger-service/internal/application/dto/message"
	queryservice "github.com/tumlumtala/messenger-service/internal/application/query"
	"github.com/tumlumtala/messenger-service/internal/domain/entity"
	domainerrors "github.com/tumlumtala/messenger-service/internal/domain/errors"
	"github.com/tumlumtala/messenger-service/internal/domain/repository"
)

type SetReactionUseCase struct {
	messageQS        queryservice.UserMessageQueryService
	messageRepo      repository.UserMessageRepository
	conversationQS   queryservice.UserConversationQueryService
	conversationRepo repository.UserConversationRepository
}

func NewSetReactionUseCase(
	messageQS queryservice.UserMessageQueryService,
	messageRepo repository.UserMessageRepository,
	conversationQS queryservice.UserConversationQueryService,
	conversationRepo repository.UserConversationRepository,
) *SetReactionUseCase {
	return &SetReactionUseCase{messageQS: messageQS, messageRepo: messageRepo, conversationQS: conversationQS, conversationRepo: conversationRepo}
}

func (uc *SetReactionUseCase) Execute(ctx context.Context, input messageDTO.SetReactionInput) (*messageDTO.SetReactionOutput, error) {
	reaction := strings.TrimSpace(input.Reaction)
	if reaction == "" {
		return nil, domainerrors.ErrInvalidReaction
	}
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
	if err := uc.messageRepo.SetReaction(ctx, input.MessageID, input.UserID, reaction); err != nil {
		return nil, domainerrors.ErrSetReaction
	}
	if msg.SenderID != input.UserID {
		senderParticipant, err := uc.conversationRepo.GetParticipant(ctx, msg.ConversationID, input.UserID)
		if err == nil && senderParticipant != nil {
			senderName := strings.TrimSpace(senderParticipant.Nickname)
			if senderName == "" {
				senderName = senderParticipant.FullName
			}
			content := fmt.Sprintf("%s đã thả %s tin nhắn của bạn", senderName, reaction)
			type reactionNotifyMeta struct {
				ReactToUser uint `json:"react_to_user"`
			}
			metaBytes, _ := json.Marshal(reactionNotifyMeta{ReactToUser: msg.SenderID})
			systemMsg := &entity.UserMessage{
				ConversationID: msg.ConversationID,
				SenderID:       input.UserID,
				Content:        content,
				MessageType:    "reaction",
				Metadata:       string(metaBytes),
			}
			if createErr := uc.messageRepo.CreateMessage(ctx, systemMsg); createErr == nil {
				_ = uc.conversationRepo.UpdateLastMessageAtReaction(ctx, msg.ConversationID, systemMsg.ID, input.UserID, msg.SenderID, content)
			}
		}
	}
	return &messageDTO.SetReactionOutput{
		MessageID:      input.MessageID,
		ConversationID: msg.ConversationID,
		UserID:         input.UserID,
		Reaction:       reaction,
	}, nil
}
