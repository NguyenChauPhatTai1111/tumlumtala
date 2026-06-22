package queryservice

import (
	"context"

	"github.com/tumlumtala/messenger-service/internal/domain/entity"
	"github.com/tumlumtala/messenger-service/internal/shared/utils"
)

type UserMessageQueryService interface {
	GetMessagesByConversationID(ctx context.Context, conversationID, userID uint, filter utils.QueryFilter) ([]entity.UserMessage, int64, error)
	GetMessageByID(ctx context.Context, messageID uint) (*entity.UserMessage, error)
	SetReaction(ctx context.Context, messageID, userID uint, reaction string) error
	SearchMessages(ctx context.Context, conversationID uint, query string, filter utils.QueryFilter) ([]entity.UserMessage, int64, error)
	SearchAllMessages(ctx context.Context, userID uint, query string, filter utils.QueryFilter) ([]entity.UserMessage, error)
}
