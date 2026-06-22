package model

import (
	"time"

	"gorm.io/gorm"

	"github.com/tumlumtala/messenger-service/internal/domain/entity"
)

type UserMessage struct {
	ID               uint `gorm:"primaryKey"`
	ConversationID   uint `gorm:"index"`
	SenderID         uint `gorm:"index"`
	Content          string
	MessageType      string
	ReplyToMessageID *uint  `gorm:"index"`
	Metadata         string `gorm:"type:json"`
	CreatedAt        time.Time
	UpdatedAt        time.Time
	DeletedAt        gorm.DeletedAt `gorm:"index"`
}

func (UserMessage) TableName() string {
	return "messages"
}

func (m *UserMessage) ToEntity() *entity.UserMessage {
	var deletedAt *time.Time
	if m.DeletedAt.Valid {
		t := m.DeletedAt.Time
		deletedAt = &t
	}
	return &entity.UserMessage{
		ID:               m.ID,
		ConversationID:   m.ConversationID,
		Seq:              m.ID,
		SenderID:         m.SenderID,
		Content:          m.Content,
		MessageType:      m.MessageType,
		ReplyToMessageID: m.ReplyToMessageID,
		Metadata:         m.Metadata,
		CreatedAt:        m.CreatedAt,
		UpdatedAt:        m.UpdatedAt,
		DeletedAt:        deletedAt,
	}
}

func MessageFromEntity(e *entity.UserMessage) *UserMessage {
	meta := e.Metadata
	if meta == "" {
		meta = "{}"
	}
	return &UserMessage{
		ID:               e.ID,
		ConversationID:   e.ConversationID,
		SenderID:         e.SenderID,
		Content:          e.Content,
		MessageType:      e.MessageType,
		ReplyToMessageID: e.ReplyToMessageID,
		Metadata:         meta,
		CreatedAt:        e.CreatedAt,
		UpdatedAt:        e.UpdatedAt,
	}
}
