package conversation

import (
	"context"

	conversationDTO "github.com/tumlumtala/messenger-service/internal/application/dto/conversation"
	queryservice "github.com/tumlumtala/messenger-service/internal/application/query"
	"github.com/tumlumtala/messenger-service/internal/domain/entity"
	domainerrors "github.com/tumlumtala/messenger-service/internal/domain/errors"
	"github.com/tumlumtala/messenger-service/internal/domain/repository"
)

type ChangeAvatarUseCase struct {
	conversationRepo repository.UserConversationRepository
	queryService     queryservice.UserConversationQueryService
	userQS           queryservice.UserQueryService
	activityRepo     repository.UserConversationActivityRepository
}

func NewChangeAvatarUseCase(
	conversationRepo repository.UserConversationRepository,
	queryService queryservice.UserConversationQueryService,
	userQS queryservice.UserQueryService,
	activityRepo repository.UserConversationActivityRepository,
) *ChangeAvatarUseCase {
	return &ChangeAvatarUseCase{conversationRepo: conversationRepo, queryService: queryService, userQS: userQS, activityRepo: activityRepo}
}

func (uc *ChangeAvatarUseCase) Execute(ctx context.Context, conversationID uint, userID uint, req conversationDTO.ChangeAvatarRequest) error {
	conversation, err := uc.queryService.GetConversationByID(ctx, conversationID)
	if err != nil {
		return err
	}
	if conversation == nil {
		return domainerrors.ErrConversationNotFound
	}
	isParticipant, err := uc.queryService.IsParticipant(ctx, conversationID, userID)
	if err != nil {
		return err
	}
	if !isParticipant {
		return domainerrors.ErrNotParticipant
	}
	conversation.Avatar = req.Avatar
	if err := uc.conversationRepo.UpdateConversation(ctx, conversation); err != nil {
		return err
	}
	if conversation.IsGroup {
		actor, err := uc.userQS.GetUserByID(ctx, userID)
		if err == nil && actor != nil {
			activity := &entity.Activity{
				ConversationID: conversationID,
				ActorUserID:    userID,
				ActionType:     "change_avatar",
				Content:        actor.FullName + " đã thay đổi ảnh đại diện nhóm",
			}
			_ = uc.activityRepo.CreateActivity(ctx, activity)
		}
	}
	return nil
}
