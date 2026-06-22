package conversation

import (
	"context"

	conversationDTO "github.com/tumlumtala/messenger-service/internal/application/dto/conversation"
	queryservice "github.com/tumlumtala/messenger-service/internal/application/query"
	"github.com/tumlumtala/messenger-service/internal/domain/entity"
	domainerrors "github.com/tumlumtala/messenger-service/internal/domain/errors"
	"github.com/tumlumtala/messenger-service/internal/domain/repository"
)

type ChangeBackgroundUseCase struct {
	conversationRepo repository.UserConversationRepository
	queryService     queryservice.UserConversationQueryService
	userQS           queryservice.UserQueryService
	activityRepo     repository.UserConversationActivityRepository
}

func NewChangeBackgroundUseCase(
	conversationRepo repository.UserConversationRepository,
	queryService queryservice.UserConversationQueryService,
	userQS queryservice.UserQueryService,
	activityRepo repository.UserConversationActivityRepository,
) *ChangeBackgroundUseCase {
	return &ChangeBackgroundUseCase{conversationRepo: conversationRepo, queryService: queryService, userQS: userQS, activityRepo: activityRepo}
}

func (uc *ChangeBackgroundUseCase) Execute(ctx context.Context, conversationID uint, userID uint, req conversationDTO.ChangeBackgroundRequest) error {
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
	conversation.ThemeID = &req.ThemeID
	if req.ThemeURL != nil {
		conversation.ThemeURL = *req.ThemeURL
	}
	conversation.CustomIncomingBubbleColor = req.CustomIncomingBubbleColor
	conversation.CustomOutgoingBubbleColor = req.CustomOutgoingBubbleColor
	conversation.CustomIncomingTextColor = req.CustomIncomingTextColor
	conversation.CustomOutgoingTextColor = req.CustomOutgoingTextColor
	if err := uc.conversationRepo.UpdateConversation(ctx, conversation); err != nil {
		return err
	}
	if conversation.IsGroup {
		actor, err := uc.userQS.GetUserByID(ctx, userID)
		if err == nil && actor != nil {
			activity := &entity.Activity{
				ConversationID: conversationID,
				ActorUserID:    userID,
				ActionType:     "change_background",
				Content:        actor.FullName + " đã thay đổi nền cuộc trò chuyện",
			}
			_ = uc.activityRepo.CreateActivity(ctx, activity)
		}
	}
	return nil
}
