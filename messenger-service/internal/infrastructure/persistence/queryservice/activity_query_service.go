package queryservice

import (
	"context"

	domainerrors "github.com/tumlumtala/messenger-service/internal/domain/errors"
	"github.com/tumlumtala/messenger-service/internal/domain/entity"
	"github.com/tumlumtala/messenger-service/internal/domain/repository"
	queryservice "github.com/tumlumtala/messenger-service/internal/application/query"
	"github.com/tumlumtala/messenger-service/internal/shared/utils"
)

type userConversationActivityQueryService struct {
	activityRepo   repository.UserConversationActivityRepository
	conversationQS queryservice.UserConversationQueryService
}

func NewUserConversationActivityQueryService(activityRepo repository.UserConversationActivityRepository, conversationQS queryservice.UserConversationQueryService) queryservice.UserConversationActivityQueryService {
	return &userConversationActivityQueryService{activityRepo: activityRepo, conversationQS: conversationQS}
}

func (qs *userConversationActivityQueryService) GetActivitiesByConversationID(ctx context.Context, conversationID uint, filter utils.QueryFilter) ([]entity.Activity, int64, error) {
	if conversationID == 0 {
		return nil, 0, domainerrors.ErrConversationNotFound
	}

	if _, err := qs.conversationQS.GetConversationByID(ctx, conversationID); err != nil {
		return nil, 0, err
	}
	return qs.activityRepo.GetActivitiesByConversationID(ctx, conversationID, filter)
}
