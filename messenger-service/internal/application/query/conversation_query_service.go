package queryservice

import (
	"context"

	"github.com/tumlumtala/messenger-service/internal/domain/entity"
	"github.com/tumlumtala/messenger-service/internal/shared/utils"
)

type UserConversationQueryService interface {
	GetConversationByID(ctx context.Context, conversationID uint) (*entity.UserConversation, error)
	GetUserConversations(ctx context.Context, userID uint, filter utils.QueryFilter) ([]entity.UserConversation, int64, error)
	IsParticipant(ctx context.Context, conversationID, userID uint) (bool, error)
	GetParticipants(ctx context.Context, conversationID uint) ([]entity.ParticipantInfo, error)
	GetParticipant(ctx context.Context, conversationID, userID uint) (*entity.ParticipantInfo, error)
	FindNextOwner(ctx context.Context, conversationID, excludingUserID uint) (*entity.ParticipantInfo, error)
}
