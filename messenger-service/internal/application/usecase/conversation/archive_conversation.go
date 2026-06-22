package conversation

import (
	"context"

	queryservice "github.com/tumlumtala/messenger-service/internal/application/query"
	domainerrors "github.com/tumlumtala/messenger-service/internal/domain/errors"
	"github.com/tumlumtala/messenger-service/internal/domain/repository"
)

type ArchiveConversationUseCase struct {
	repo         repository.UserConversationRepository
	queryService queryservice.UserConversationQueryService
}

func NewArchiveConversationUseCase(repo repository.UserConversationRepository, queryService queryservice.UserConversationQueryService) *ArchiveConversationUseCase {
	return &ArchiveConversationUseCase{repo: repo, queryService: queryService}
}

func (uc *ArchiveConversationUseCase) Execute(ctx context.Context, conversationID, userID uint) error {
	ok, err := uc.queryService.IsParticipant(ctx, conversationID, userID)
	if err != nil {
		return err
	}
	if !ok {
		return domainerrors.ErrNotInConversation
	}
	return uc.repo.ArchiveConversation(ctx, conversationID, userID)
}

type RestoreConversationUseCase struct {
	repo         repository.UserConversationRepository
	queryService queryservice.UserConversationQueryService
}

func NewRestoreConversationUseCase(repo repository.UserConversationRepository, queryService queryservice.UserConversationQueryService) *RestoreConversationUseCase {
	return &RestoreConversationUseCase{repo: repo, queryService: queryService}
}

func (uc *RestoreConversationUseCase) Execute(ctx context.Context, conversationID, userID uint) error {
	ok, err := uc.queryService.IsParticipant(ctx, conversationID, userID)
	if err != nil {
		return err
	}
	if !ok {
		return domainerrors.ErrNotInConversation
	}
	return uc.repo.RestoreConversation(ctx, conversationID, userID)
}

type DeleteConversationUseCase struct {
	repo         repository.UserConversationRepository
	queryService queryservice.UserConversationQueryService
}

func NewDeleteConversationUseCase(repo repository.UserConversationRepository, queryService queryservice.UserConversationQueryService) *DeleteConversationUseCase {
	return &DeleteConversationUseCase{repo: repo, queryService: queryService}
}

func (uc *DeleteConversationUseCase) Execute(ctx context.Context, conversationID, userID uint) error {
	ok, err := uc.queryService.IsParticipant(ctx, conversationID, userID)
	if err != nil {
		return err
	}
	if !ok {
		return domainerrors.ErrNotInConversation
	}
	return uc.repo.DeleteConversation(ctx, conversationID, userID)
}
