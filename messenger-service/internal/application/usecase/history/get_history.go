package history

import (
	"context"

	historyDTO "github.com/tumlumtala/messenger-service/internal/application/dto/history"
	"github.com/tumlumtala/messenger-service/internal/domain/repository"
)

type GetMessageHistoryUseCase struct {
	historyRepo repository.UserMessageHistoryRepository
}

func NewGetMessageHistoryUseCase(historyRepo repository.UserMessageHistoryRepository) *GetMessageHistoryUseCase {
	return &GetMessageHistoryUseCase{historyRepo: historyRepo}
}

func (uc *GetMessageHistoryUseCase) Execute(ctx context.Context, messageID uint) ([]*historyDTO.MessageHistoryDTO, error) {
	histories, err := uc.historyRepo.GetMessageHistories(ctx, messageID)
	if err != nil {
		return nil, err
	}
	out := make([]*historyDTO.MessageHistoryDTO, len(histories))
	for i, h := range histories {
		out[i] = &historyDTO.MessageHistoryDTO{
			ID:       h.ID,
			Content:  h.Content,
			EditedBy: h.EditedBy,
			EditedAt: *h.EditedAt,
		}
	}
	return out, nil
}
