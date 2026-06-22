package conversation

import (
	"context"

	conversationDTO "github.com/tumlumtala/messenger-service/internal/application/dto/conversation"
	queryservice "github.com/tumlumtala/messenger-service/internal/application/query"
	"github.com/tumlumtala/messenger-service/internal/domain/entity"
	domainerrors "github.com/tumlumtala/messenger-service/internal/domain/errors"
	"github.com/tumlumtala/messenger-service/internal/domain/repository"
)

type SetQuickReactionUseCase struct {
	conversationRepo repository.UserConversationRepository
	queryService     queryservice.UserConversationQueryService
	userQS           queryservice.UserQueryService
	activityRepo     repository.UserConversationActivityRepository
}

func NewSetQuickReactionUseCase(
	conversationRepo repository.UserConversationRepository,
	queryService queryservice.UserConversationQueryService,
	userQS queryservice.UserQueryService,
	activityRepo repository.UserConversationActivityRepository,
) *SetQuickReactionUseCase {
	return &SetQuickReactionUseCase{conversationRepo: conversationRepo, queryService: queryService, userQS: userQS, activityRepo: activityRepo}
}

func (uc *SetQuickReactionUseCase) Execute(ctx context.Context, conversationID, userID uint, req conversationDTO.SetQuickReactionRequest) error {
	conv, err := uc.queryService.GetConversationByID(ctx, conversationID)
	if err != nil {
		return err
	}
	if conv == nil {
		return domainerrors.ErrConversationNotFound
	}
	ok, err := uc.queryService.IsParticipant(ctx, conversationID, userID)
	if err != nil {
		return err
	}
	if !ok {
		return domainerrors.ErrNotParticipant
	}
	conv.QuickReaction = req.QuickReaction
	if err := uc.conversationRepo.UpdateConversation(ctx, conv); err != nil {
		return err
	}
	actor, err := uc.userQS.GetUserByID(ctx, userID)
	if err == nil && actor != nil {
		activity := &entity.Activity{
			ConversationID: conversationID,
			ActorUserID:    userID,
			ActionType:     "set_quick_reaction",
			Content:        actor.FullName + " đã thay đổi reaction nhanh thành " + req.QuickReaction,
		}
		_ = uc.activityRepo.CreateActivity(ctx, activity)
	}
	return nil
}
