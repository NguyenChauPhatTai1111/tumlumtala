package conversation

import (
	"context"

	conversationDTO "github.com/tumlumtala/messenger-service/internal/application/dto/conversation"
	queryservice "github.com/tumlumtala/messenger-service/internal/application/query"
	domainerrors "github.com/tumlumtala/messenger-service/internal/domain/errors"
	"github.com/tumlumtala/messenger-service/internal/domain/repository"
)

type RenameConversationUseCase struct {
	repo         repository.UserConversationRepository
	queryService queryservice.UserConversationQueryService
}

func NewRenameConversationUseCase(repo repository.UserConversationRepository, queryService queryservice.UserConversationQueryService) *RenameConversationUseCase {
	return &RenameConversationUseCase{repo: repo, queryService: queryService}
}

func (uc *RenameConversationUseCase) Execute(ctx context.Context, conversationID, userID uint, req conversationDTO.RenameConversationRequest) error {
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
	ok, err := uc.queryService.IsParticipant(ctx, conversationID, userID)
	if err != nil {
		return err
	}
	if !ok {
		return domainerrors.ErrNotParticipant
	}
	conv.Name = req.Name
	return uc.repo.UpdateConversation(ctx, conv)
}
