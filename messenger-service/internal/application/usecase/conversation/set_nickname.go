package conversation

import (
	"context"

	conversationDTO "github.com/tumlumtala/messenger-service/internal/application/dto/conversation"
	queryservice "github.com/tumlumtala/messenger-service/internal/application/query"
	"github.com/tumlumtala/messenger-service/internal/domain/entity"
	domainerrors "github.com/tumlumtala/messenger-service/internal/domain/errors"
	"github.com/tumlumtala/messenger-service/internal/domain/repository"
)

type SetNicknameUseCase struct {
	conversationRepo repository.UserConversationRepository
	queryService     queryservice.UserConversationQueryService
	userQS           queryservice.UserQueryService
	activityRepo     repository.UserConversationActivityRepository
}

func NewSetNicknameUseCase(
	conversationRepo repository.UserConversationRepository,
	queryService queryservice.UserConversationQueryService,
	userQS queryservice.UserQueryService,
	activityRepo repository.UserConversationActivityRepository,
) *SetNicknameUseCase {
	return &SetNicknameUseCase{conversationRepo: conversationRepo, queryService: queryService, userQS: userQS, activityRepo: activityRepo}
}

func (uc *SetNicknameUseCase) Execute(ctx context.Context, conversationID, userID, targetUserID uint, req conversationDTO.SetNicknameRequest) error {
	ok, err := uc.queryService.IsParticipant(ctx, conversationID, userID)
	if err != nil {
		return err
	}
	if !ok {
		return domainerrors.ErrNotParticipant
	}
	if err := uc.conversationRepo.UpdateParticipantNickname(ctx, conversationID, targetUserID, req.Nickname); err != nil {
		return err
	}
	actor, _ := uc.userQS.GetUserByID(ctx, userID)
	target, _ := uc.userQS.GetUserByID(ctx, targetUserID)
	if actor != nil && target != nil {
		content := actor.FullName + " đã đặt biệt danh cho " + target.FullName
		if req.Nickname != "" {
			content += " là " + req.Nickname
		}
		activity := &entity.Activity{
			ConversationID: conversationID,
			ActorUserID:    userID,
			TargetUserID:   &targetUserID,
			ActionType:     "set_nickname",
			Content:        content,
		}
		_ = uc.activityRepo.CreateActivity(ctx, activity)
	}
	return nil
}
