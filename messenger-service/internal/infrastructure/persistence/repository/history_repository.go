package repository

import (
	"context"

	"gorm.io/gorm"

	"github.com/tumlumtala/messenger-service/internal/domain/entity"
	"github.com/tumlumtala/messenger-service/internal/infrastructure/persistence/model"
)

type MessageHistoryRepository struct {
	db *gorm.DB
}

func NewMessageHistoryRepository(db *gorm.DB) *MessageHistoryRepository {
	return &MessageHistoryRepository{db: db}
}

func (r *MessageHistoryRepository) AddMessageHistory(ctx context.Context, history *entity.UserMessageHistory) error {
	return r.db.WithContext(ctx).Create(model.MessageHistoryFromEntity(history)).Error
}

func (r *MessageHistoryRepository) GetMessageHistories(ctx context.Context, messageID uint) ([]*entity.UserMessageHistory, error) {
	var models []model.UserMessageHistory
	if err := r.db.WithContext(ctx).Where("message_id = ?", messageID).Order("edited_at DESC").Find(&models).Error; err != nil {
		return nil, err
	}
	histories := make([]*entity.UserMessageHistory, len(models))
	for i, m := range models {
		histories[i] = m.ToEntity()
	}
	return histories, nil
}
