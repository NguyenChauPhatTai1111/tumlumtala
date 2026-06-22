package model

import (
	"time"

	"github.com/tumlumtala/messenger-service/internal/domain/entity"
)

type UserMessageHistory struct {
	ID        uint `gorm:"primaryKey"`
	MessageID uint
	EditedBy  uint
	Content   string `gorm:"type:text"`
	EditedAt  *time.Time
}

func (UserMessageHistory) TableName() string {
	return "message_histories"
}

func (m *UserMessageHistory) ToEntity() *entity.UserMessageHistory {
	return &entity.UserMessageHistory{
		ID:        m.ID,
		MessageID: m.MessageID,
		EditedBy:  m.EditedBy,
		Content:   m.Content,
		EditedAt:  m.EditedAt,
	}
}

func MessageHistoryFromEntity(e *entity.UserMessageHistory) *UserMessageHistory {
	return &UserMessageHistory{
		ID:        e.ID,
		MessageID: e.MessageID,
		EditedBy:  e.EditedBy,
		Content:   e.Content,
		EditedAt:  e.EditedAt,
	}
}
