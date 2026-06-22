package queryservice

import (
	"context"

	domainerrors "github.com/tumlumtala/messenger-service/internal/domain/errors"
	"github.com/tumlumtala/messenger-service/internal/domain/entity"
	"github.com/tumlumtala/messenger-service/internal/domain/repository"
	queryservice "github.com/tumlumtala/messenger-service/internal/application/query"
	"github.com/tumlumtala/messenger-service/internal/shared/utils"
)

// userConversationQueryService implements UserConversationQueryService
type userConversationQueryService struct {
	conversationRepo repository.UserConversationRepository
	messageRepo      repository.UserMessageRepository
}

// NewUserConversationQueryService creates a new user conversation query service
func NewUserConversationQueryService(
	conversationRepo repository.UserConversationRepository,
	messageRepo repository.UserMessageRepository,
) queryservice.UserConversationQueryService {
	return &userConversationQueryService{
		conversationRepo: conversationRepo,
		messageRepo:      messageRepo,
	}
}

func (qs *userConversationQueryService) GetConversationByID(ctx context.Context, conversationID uint) (*entity.UserConversation, error) {
	if conversationID == 0 {
		return nil, domainerrors.ErrConversationNotFound
	}
	return qs.conversationRepo.GetConversationByID(ctx, conversationID)
}

func (qs *userConversationQueryService) GetUserConversations(ctx context.Context, userID uint, filter utils.QueryFilter) ([]entity.UserConversation, int64, error) {
	if userID == 0 {
		return nil, 0, domainerrors.ErrUserNotFound
	}
	return qs.conversationRepo.GetUserConversations(ctx, userID, filter)
}

func (qs *userConversationQueryService) IsParticipant(ctx context.Context, conversationID, userID uint) (bool, error) {
	if conversationID == 0 {
		return false, domainerrors.ErrConversationNotFound
	}
	if userID == 0 {
		return false, domainerrors.ErrUserNotFound
	}
	return qs.conversationRepo.IsParticipant(ctx, conversationID, userID)
}

func (qs *userConversationQueryService) GetParticipants(ctx context.Context, conversationID uint) ([]entity.ParticipantInfo, error) {
	if conversationID == 0 {
		return nil, domainerrors.ErrConversationNotFound
	}
	return qs.conversationRepo.GetParticipants(ctx, conversationID)
}

func (qs *userConversationQueryService) GetParticipant(ctx context.Context, conversationID, userID uint) (*entity.ParticipantInfo, error) {
	if conversationID == 0 {
		return nil, domainerrors.ErrConversationNotFound
	}
	if userID == 0 {
		return nil, domainerrors.ErrUserNotFound
	}
	return qs.conversationRepo.GetParticipant(ctx, conversationID, userID)
}

func (qs *userConversationQueryService) FindNextOwner(ctx context.Context, conversationID, excludingUserID uint) (*entity.ParticipantInfo, error) {
	if conversationID == 0 {
		return nil, domainerrors.ErrConversationNotFound
	}
	if excludingUserID == 0 {
		return nil, domainerrors.ErrUserNotFound
	}
	return qs.conversationRepo.FindNextOwner(ctx, conversationID, excludingUserID)
}
