package conversation

import (
	"context"

	"github.com/tumlumtala/messenger-service/internal/domain/entity"
	domainerrors "github.com/tumlumtala/messenger-service/internal/domain/errors"
	"github.com/tumlumtala/messenger-service/internal/domain/repository"
)

type GetParticipantsUseCase struct {
	repo repository.UserConversationRepository
}

func NewGetParticipantsUseCase(repo repository.UserConversationRepository) *GetParticipantsUseCase {
	return &GetParticipantsUseCase{repo: repo}
}

func (uc *GetParticipantsUseCase) Execute(ctx context.Context, conversationID, userID uint) ([]entity.ParticipantInfo, error) {
	ok, err := uc.repo.IsParticipant(ctx, conversationID, userID)
	if err != nil {
		return nil, err
	}
	if !ok {
		return nil, domainerrors.ErrNotParticipant
	}
	return uc.repo.GetParticipants(ctx, conversationID)
}
