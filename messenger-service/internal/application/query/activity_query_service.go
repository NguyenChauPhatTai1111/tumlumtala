package queryservice

import (
	"context"

	"github.com/tumlumtala/messenger-service/internal/domain/entity"
	"github.com/tumlumtala/messenger-service/internal/shared/utils"
)

type UserConversationActivityQueryService interface {
	GetActivitiesByConversationID(ctx context.Context, conversationID uint, filter utils.QueryFilter) ([]entity.Activity, int64, error)
}
