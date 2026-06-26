package model

import (
	"time"

	"github.com/tumlumtala/messenger-service/internal/domain/entity"
)

type CallSession struct {
	ID             string `gorm:"primaryKey;size:36"`
	ConversationID uint
	CallerID       uint
	ReceiverID     uint
	CallType       string
	Status         string
	StartedAt      *time.Time
	EndedAt        *time.Time
	Duration       int `gorm:"column:duration_seconds"`
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

func (CallSession) TableName() string {
	return "call_sessions"
}

func (m *CallSession) ToEntity() *entity.CallSession {
	return &entity.CallSession{
		ID:             m.ID,
		ConversationID: m.ConversationID,
		CallerID:       m.CallerID,
		ReceiverID:     m.ReceiverID,
		CallType:       m.CallType,
		Status:         m.Status,
		StartedAt:      m.StartedAt,
		EndedAt:        m.EndedAt,
		Duration:       m.Duration,
		CreatedAt:      m.CreatedAt,
		UpdatedAt:      m.UpdatedAt,
	}
}

func CallSessionFromEntity(e *entity.CallSession) *CallSession {
	return &CallSession{
		ID:             e.ID,
		ConversationID: e.ConversationID,
		CallerID:       e.CallerID,
		ReceiverID:     e.ReceiverID,
		CallType:       e.CallType,
		Status:         e.Status,
		StartedAt:      e.StartedAt,
		EndedAt:        e.EndedAt,
		Duration:       e.Duration,
		CreatedAt:      e.CreatedAt,
		UpdatedAt:      e.UpdatedAt,
	}
}
