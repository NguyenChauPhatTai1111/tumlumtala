package conversation

import (
	"context"

	conversationDTO "github.com/tumlumtala/messenger-service/internal/application/dto/conversation"
	queryservice "github.com/tumlumtala/messenger-service/internal/application/query"
	"github.com/tumlumtala/messenger-service/internal/domain/entity"
	domainerrors "github.com/tumlumtala/messenger-service/internal/domain/errors"
	"github.com/tumlumtala/messenger-service/internal/domain/repository"
)

type AddMembersUseCase struct {
	conversationQS   queryservice.UserConversationQueryService
	conversationRepo repository.UserConversationRepository
	userQS           queryservice.UserQueryService
	activityRepo     repository.UserConversationActivityRepository
}

func NewAddMembersUseCase(
	conversationQS queryservice.UserConversationQueryService,
	conversationRepo repository.UserConversationRepository,
	userQS queryservice.UserQueryService,
	activityRepo repository.UserConversationActivityRepository,
) *AddMembersUseCase {
	return &AddMembersUseCase{conversationQS: conversationQS, conversationRepo: conversationRepo, userQS: userQS, activityRepo: activityRepo}
}

func (uc *AddMembersUseCase) Execute(ctx context.Context, conversationID uint, userID uint, req conversationDTO.AddMembersRequest) error {
	conversation, err := uc.conversationQS.GetConversationByID(ctx, conversationID)
	if err != nil {
		return err
	}
	if conversation == nil {
		return domainerrors.ErrConversationNotFound
	}
	if !conversation.IsGroup {
		return domainerrors.ErrNotGroupConversation
	}
	isParticipant, err := uc.conversationQS.IsParticipant(ctx, conversationID, userID)
	if err != nil {
		return err
	}
	if !isParticipant {
		return domainerrors.ErrNotParticipant
	}

	for _, uid := range req.UserIDs {
		u, err := uc.userQS.GetUserByID(ctx, uid)
		if err != nil {
			return err
		}
		if u == nil {
			return domainerrors.ErrUserNotFound
		}
		isAlready, err := uc.conversationQS.IsParticipant(ctx, conversationID, uid)
		if err != nil {
			return err
		}
		if isAlready {
			continue
		}
		participant := &entity.UserConversationParticipant{
			ConversationID: conversationID,
			UserID:         uid,
			Role:           "member",
		}
		if err := uc.conversationRepo.AddParticipant(ctx, participant); err != nil {
			return err
		}
		actor, err := uc.userQS.GetUserByID(ctx, userID)
		if err != nil {
			return err
		}
		activity := &entity.Activity{
			ConversationID: conversationID,
			ActorUserID:    userID,
			TargetUserID:   &uid,
			ActionType:     "add_member",
			Content:        actor.FullName + " đã thêm " + u.FullName + " vào nhóm",
		}
		if err := uc.activityRepo.CreateActivity(ctx, activity); err != nil {
			return err
		}
	}
	return nil
}
