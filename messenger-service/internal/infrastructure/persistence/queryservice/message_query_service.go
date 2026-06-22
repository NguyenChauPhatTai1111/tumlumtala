package queryservice

import (
	"context"

	domainerrors "github.com/tumlumtala/messenger-service/internal/domain/errors"
	"github.com/tumlumtala/messenger-service/internal/domain/entity"
	"github.com/tumlumtala/messenger-service/internal/domain/repository"
	queryservice "github.com/tumlumtala/messenger-service/internal/application/query"
	"github.com/tumlumtala/messenger-service/internal/shared/utils"
)

// userMessageQueryService implements MessageQueryService
type userMessageQueryService struct {
	messageRepo      repository.UserMessageRepository
	conversationRepo repository.UserConversationRepository
}

// NewUserMessageQueryService creates a new message query service
func NewUserMessageQueryService(
	messageRepo repository.UserMessageRepository,
	conversationRepo repository.UserConversationRepository,
) queryservice.UserMessageQueryService {
	return &userMessageQueryService{
		messageRepo:      messageRepo,
		conversationRepo: conversationRepo,
	}
}

func (qs *userMessageQueryService) GetMessagesByConversationID(ctx context.Context, conversationID, userID uint, filter utils.QueryFilter) ([]entity.UserMessage, int64, error) {
	if conversationID == 0 {
		return nil, 0, domainerrors.ErrConversationNotFound
	}
	if userID == 0 {
		return nil, 0, domainerrors.ErrUserNotFound
	}
	return qs.messageRepo.GetMessagesByConversationID(ctx, conversationID, userID, filter)
}

func (qs *userMessageQueryService) GetMessageByID(ctx context.Context, messageID uint) (*entity.UserMessage, error) {
	if messageID == 0 {
		return nil, domainerrors.ErrInvalidMessageID
	}
	return qs.messageRepo.GetMessageByID(ctx, messageID)
}

func (qs *userMessageQueryService) SetReaction(ctx context.Context, messageID, userID uint, reaction string) error {
	if messageID == 0 {
		return domainerrors.ErrInvalidMessageID
	}
	if userID == 0 {
		return domainerrors.ErrUserNotFound
	}
	return qs.messageRepo.SetReaction(ctx, messageID, userID, reaction)
}

func (qs *userMessageQueryService) SearchMessages(ctx context.Context, conversationID uint, query string, filter utils.QueryFilter) ([]entity.UserMessage, int64, error) {
	if conversationID == 0 {
		return nil, 0, domainerrors.ErrConversationNotFound
	}
	return qs.messageRepo.SearchMessages(ctx, conversationID, query, filter)
}

func (qs *userMessageQueryService) SearchAllMessages(ctx context.Context, userID uint, query string, filter utils.QueryFilter) ([]entity.UserMessage, error) {
	if userID == 0 {
		return nil, domainerrors.ErrUserNotFound
	}
	return qs.messageRepo.SearchAllMessages(ctx, userID, query, filter)
}
