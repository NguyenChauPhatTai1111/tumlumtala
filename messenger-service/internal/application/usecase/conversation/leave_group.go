package conversation

import (
	"context"

	queryservice "github.com/tumlumtala/messenger-service/internal/application/query"
	"github.com/tumlumtala/messenger-service/internal/domain/entity"
	domainerrors "github.com/tumlumtala/messenger-service/internal/domain/errors"
	"github.com/tumlumtala/messenger-service/internal/domain/repository"
)

type LeaveGroupUseCase struct {
	conversationRepo repository.UserConversationRepository
	queryService     queryservice.UserConversationQueryService
	activityRepo     repository.UserConversationActivityRepository
	userQS           queryservice.UserQueryService
}

func NewLeaveGroupUseCase(
	conversationRepo repository.UserConversationRepository,
	queryService queryservice.UserConversationQueryService,
	activityRepo repository.UserConversationActivityRepository,
	userQS queryservice.UserQueryService,
) *LeaveGroupUseCase {
	return &LeaveGroupUseCase{conversationRepo: conversationRepo, queryService: queryService, activityRepo: activityRepo, userQS: userQS}
}

func (uc *LeaveGroupUseCase) Execute(ctx context.Context, conversationID, userID uint) error {
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
	p, err := uc.queryService.GetParticipant(ctx, conversationID, userID)
	if err != nil {
		return err
	}
	if p == nil {
		return domainerrors.ErrNotParticipant
	}
	if p.Role == "admin" {
		next, err := uc.queryService.FindNextOwner(ctx, conversationID, userID)
		if err != nil {
			return err
		}
		if next != nil {
			_ = uc.conversationRepo.UpdateParticipantRole(ctx, conversationID, next.ID, "admin")
		}
	}
	if err := uc.conversationRepo.DeleteParticipant(ctx, conversationID, userID); err != nil {
		return err
	}
	user, err := uc.userQS.GetUserByID(ctx, userID)
	if err == nil && user != nil {
		activity := &entity.Activity{
			ConversationID: conversationID,
			ActorUserID:    userID,
			ActionType:     "leave_group",
			Content:        user.FullName + " đã rời khỏi nhóm",
		}
		_ = uc.activityRepo.CreateActivity(ctx, activity)
	}
	return nil
}
