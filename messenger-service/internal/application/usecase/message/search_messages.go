package message

import (
	"context"

	messageDTO "github.com/tumlumtala/messenger-service/internal/application/dto/message"
	queryservice "github.com/tumlumtala/messenger-service/internal/application/query"
	"github.com/tumlumtala/messenger-service/internal/domain/entity"
	domainerrors "github.com/tumlumtala/messenger-service/internal/domain/errors"
	"github.com/tumlumtala/messenger-service/internal/shared/utils"
)

type SearchMessagesUseCase struct {
	messageQS      queryservice.UserMessageQueryService
	conversationQS queryservice.UserConversationQueryService
}

func NewSearchMessagesUseCase(messageQS queryservice.UserMessageQueryService, conversationQS queryservice.UserConversationQueryService) *SearchMessagesUseCase {
	return &SearchMessagesUseCase{messageQS: messageQS, conversationQS: conversationQS}
}

func (uc *SearchMessagesUseCase) Execute(ctx context.Context, conversationID uint, userID uint, req messageDTO.SearchMessagesRequest) ([]entity.UserMessage, int64, error) {
	conversation, err := uc.conversationQS.GetConversationByID(ctx, conversationID)
	if err != nil {
		return nil, 0, err
	}
	if conversation == nil {
		return nil, 0, domainerrors.ErrConversationNotFound
	}
	isParticipant, err := uc.conversationQS.IsParticipant(ctx, conversationID, userID)
	if err != nil {
		return nil, 0, err
	}
	if !isParticipant {
		return nil, 0, domainerrors.ErrNotParticipant
	}
	filter := utils.QueryFilter{Limit: req.Limit, Offset: req.Offset}
	return uc.messageQS.SearchMessages(ctx, conversationID, req.Query, filter)
}

type SearchAllMessagesUseCase struct {
	messageQS queryservice.UserMessageQueryService
}

func NewSearchAllMessagesUseCase(messageQS queryservice.UserMessageQueryService) *SearchAllMessagesUseCase {
	return &SearchAllMessagesUseCase{messageQS: messageQS}
}

func (uc *SearchAllMessagesUseCase) Execute(ctx context.Context, userID uint, req messageDTO.SearchMessagesRequest, page int) ([]entity.UserMessage, error) {
	if page <= 0 {
		page = 1
	}
	if req.Limit <= 0 {
		req.Limit = 20
	}
	filter := utils.QueryFilter{Limit: req.Limit, Page: page}
	filter.NormalizeOffset()
	return uc.messageQS.SearchAllMessages(ctx, userID, req.Query, filter)
}
