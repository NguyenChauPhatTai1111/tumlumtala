package conversation

import (
	"context"

	queryservice "github.com/tumlumtala/messenger-service/internal/application/query"
	"github.com/tumlumtala/messenger-service/internal/domain/entity"
	domainerrors "github.com/tumlumtala/messenger-service/internal/domain/errors"
	"github.com/tumlumtala/messenger-service/internal/domain/repository"
)

type RemoveMemberUseCase struct {
	conversationRepo repository.UserConversationRepository
	queryService     queryservice.UserConversationQueryService
	userQS           queryservice.UserQueryService
	activityRepo     repository.UserConversationActivityRepository
}

func NewRemoveMemberUseCase(
	conversationRepo repository.UserConversationRepository,
	queryService queryservice.UserConversationQueryService,
	userQS queryservice.UserQueryService,
	activityRepo repository.UserConversationActivityRepository,
) *RemoveMemberUseCase {
	return &RemoveMemberUseCase{conversationRepo: conversationRepo, queryService: queryService, userQS: userQS, activityRepo: activityRepo}
}

func (uc *RemoveMemberUseCase) Execute(ctx context.Context, conversationID, userID, targetUserID uint) error {
	if userID == targetUserID {
		return domainerrors.ErrCannotRemoveSelf
	}
	conv, err := uc.queryService.GetConversationByID(ctx, conversationID)
	if err != nil {
		return err
	}
	if conv == nil {
		return domainerrors.ErrConversationNotFound
	}
	if !conv.IsGroup {
		return domainerrors.ErrNotGroupConversation
	}
	actor, err := uc.queryService.GetParticipant(ctx, conversationID, userID)
	if err != nil {
		return err
	}
	if actor == nil || actor.Role != "admin" {
		return domainerrors.ErrPermissionDenied
	}
	if err := uc.conversationRepo.DeleteParticipant(ctx, conversationID, targetUserID); err != nil {
		return err
	}
	targetUser, err := uc.userQS.GetUserByID(ctx, targetUserID)
	if err == nil && targetUser != nil {
		actorUser, err := uc.userQS.GetUserByID(ctx, userID)
		if err == nil && actorUser != nil {
			activity := &entity.Activity{
				ConversationID: conversationID,
				ActorUserID:    userID,
				TargetUserID:   &targetUserID,
				ActionType:     "remove_member",
				Content:        actorUser.FullName + " đã xóa " + targetUser.FullName + " khỏi nhóm",
			}
			_ = uc.activityRepo.CreateActivity(ctx, activity)
		}
	}
	return nil
}
