package model

import (
	"time"

	"github.com/tumlumtala/messenger-service/internal/domain/entity"
)

type CallSession struct {
	ID              string `gorm:"primaryKey;size:36"`
	ConversationID  uint
	CallerID        uint
	ReceiverID      uint
	CallType        string
	Status          string
	IsGroup         bool `gorm:"column:is_group;default:0"`
	MaxParticipants int  `gorm:"column:max_participants;default:8"`
	StartedAt       *time.Time
	EndedAt         *time.Time
	Duration        int `gorm:"column:duration_seconds"`
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

func (CallSession) TableName() string {
	return "call_sessions"
}

func (m *CallSession) ToEntity() *entity.CallSession {
	return &entity.CallSession{
		ID:              m.ID,
		ConversationID:  m.ConversationID,
		CallerID:        m.CallerID,
		ReceiverID:      m.ReceiverID,
		CallType:        m.CallType,
		Status:          m.Status,
		IsGroup:         m.IsGroup,
		MaxParticipants: m.MaxParticipants,
		StartedAt:       m.StartedAt,
		EndedAt:         m.EndedAt,
		Duration:        m.Duration,
		CreatedAt:       m.CreatedAt,
		UpdatedAt:       m.UpdatedAt,
	}
}

func CallSessionFromEntity(e *entity.CallSession) *CallSession {
	return &CallSession{
		ID:              e.ID,
		ConversationID:  e.ConversationID,
		CallerID:        e.CallerID,
		ReceiverID:      e.ReceiverID,
		CallType:        e.CallType,
		Status:          e.Status,
		IsGroup:         e.IsGroup,
		MaxParticipants: e.MaxParticipants,
		StartedAt:       e.StartedAt,
		EndedAt:         e.EndedAt,
		Duration:        e.Duration,
		CreatedAt:       e.CreatedAt,
		UpdatedAt:       e.UpdatedAt,
	}
}

type CallParticipant struct {
	ID        uint64     `gorm:"primaryKey;autoIncrement"`
	CallID    string     `gorm:"size:36;index"`
	UserID    uint       `gorm:"index"`
	Status    string     `gorm:"size:20;default:invited"`
	JoinedAt  *time.Time
	LeftAt    *time.Time
	CreatedAt time.Time
	UpdatedAt time.Time
}

func (CallParticipant) TableName() string {
	return "call_session_participants"
}

func (m *CallParticipant) ToEntity() *entity.CallParticipant {
	return &entity.CallParticipant{
		ID:       m.ID,
		CallID:   m.CallID,
		UserID:   m.UserID,
		Status:   m.Status,
		JoinedAt: m.JoinedAt,
		LeftAt:   m.LeftAt,
	}
}
