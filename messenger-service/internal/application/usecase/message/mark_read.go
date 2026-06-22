package message

import (
	"context"

	queryservice "github.com/tumlumtala/messenger-service/internal/application/query"
	domainerrors "github.com/tumlumtala/messenger-service/internal/domain/errors"
	"github.com/tumlumtala/messenger-service/internal/domain/repository"
)

type MarkReadUseCase struct {
	conversationQS   queryservice.UserConversationQueryService
	conversationRepo repository.UserConversationRepository
}

func NewMarkReadUseCase(conversationQS queryservice.UserConversationQueryService, conversationRepo repository.UserConversationRepository) *MarkReadUseCase {
	return &MarkReadUseCase{conversationQS: conversationQS, conversationRepo: conversationRepo}
}

func (uc *MarkReadUseCase) Execute(ctx context.Context, conversationID, userID uint, lastReadSeq *uint) error {
	ok, err := uc.conversationQS.IsParticipant(ctx, conversationID, userID)
	if err != nil {
		return err
	}
	if !ok {
		return domainerrors.ErrNotInConversation
	}
	return uc.conversationRepo.MarkRead(ctx, conversationID, userID, lastReadSeq)
}
