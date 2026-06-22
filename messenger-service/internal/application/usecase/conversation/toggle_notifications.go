package conversation

import (
	"context"

	conversationDTO "github.com/tumlumtala/messenger-service/internal/application/dto/conversation"
	queryservice "github.com/tumlumtala/messenger-service/internal/application/query"
	domainerrors "github.com/tumlumtala/messenger-service/internal/domain/errors"
	"github.com/tumlumtala/messenger-service/internal/domain/repository"
)

type ToggleNotificationsUseCase struct {
	repo         repository.UserConversationRepository
	queryService queryservice.UserConversationQueryService
}

func NewToggleNotificationsUseCase(repo repository.UserConversationRepository, queryService queryservice.UserConversationQueryService) *ToggleNotificationsUseCase {
	return &ToggleNotificationsUseCase{repo: repo, queryService: queryService}
}

func (uc *ToggleNotificationsUseCase) Execute(ctx context.Context, conversationID, userID uint, req conversationDTO.ToggleNotificationsRequest) error {
	ok, err := uc.queryService.IsParticipant(ctx, conversationID, userID)
	if err != nil {
		return err
	}
	if !ok {
		return domainerrors.ErrNotParticipant
	}
	return uc.repo.UpdateParticipantNotifications(ctx, conversationID, userID, req.Enabled)
}
