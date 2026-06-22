package repository

import (
	"context"

	"github.com/tumlumtala/messenger-service/internal/domain/entity"
)

type UserMessageHistoryRepository interface {
	AddMessageHistory(ctx context.Context, history *entity.UserMessageHistory) error
	GetMessageHistories(ctx context.Context, messageID uint) ([]*entity.UserMessageHistory, error)
}
