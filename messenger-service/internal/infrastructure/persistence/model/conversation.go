package model

import (
	"time"

	"github.com/tumlumtala/messenger-service/internal/domain/entity"
)

type UserConversation struct {
	ID                        uint `gorm:"primaryKey"`
	IsGroup                   bool
	Name                      string
	Avatar                    string
	ThemeID                   *uint
	ThemeURL                  string
	Background                string
	BackgroundColor           string
	IncomingBubbleColor       string
	OutgoingBubbleColor       string
	IncomingTextColor         string
	OutgoingTextColor         string
	CustomIncomingBubbleColor string `gorm:"column:custom_incoming_bubble_color"`
	CustomOutgoingBubbleColor string `gorm:"column:custom_outgoing_bubble_color"`
	CustomIncomingTextColor   string `gorm:"column:custom_incoming_text_color"`
	CustomOutgoingTextColor   string `gorm:"column:custom_outgoing_text_color"`
	QuickReaction             string
	CreatedBy                 uint
	CreatedAt                 time.Time
	UpdatedAt                 time.Time
	LastMessageAt             *time.Time
	LastMessageID             *uint
	LastMessageContent        string
	LastMessageSenderID       *uint
}

func (UserConversation) TableName() string {
	return "conversations"
}

func (m *UserConversation) ToEntity() *entity.UserConversation {
	return &entity.UserConversation{
		ID:                        m.ID,
		IsGroup:                   m.IsGroup,
		Name:                      m.Name,
		Avatar:                    m.Avatar,
		ThemeID:                   m.ThemeID,
		ThemeURL:                  m.ThemeURL,
		Background:                m.Background,
		BackgroundColor:           m.BackgroundColor,
		CustomIncomingBubbleColor: m.CustomIncomingBubbleColor,
		CustomOutgoingBubbleColor: m.CustomOutgoingBubbleColor,
		CustomIncomingTextColor:   m.CustomIncomingTextColor,
		CustomOutgoingTextColor:   m.CustomOutgoingTextColor,
		QuickReaction:             m.QuickReaction,
		CreatedBy:                 m.CreatedBy,
		CreatedAt:                 m.CreatedAt,
		UpdatedAt:                 m.UpdatedAt,
		LastMessageAt:             m.LastMessageAt,
		LastMessageID:             m.LastMessageID,
		LastMessageContent:        m.LastMessageContent,
		LastMessageSenderID:       m.LastMessageSenderID,
	}
}

func ConversationFromEntity(e *entity.UserConversation) *UserConversation {
	return &UserConversation{
		ID:                        e.ID,
		IsGroup:                   e.IsGroup,
		Name:                      e.Name,
		Avatar:                    e.Avatar,
		ThemeID:                   e.ThemeID,
		ThemeURL:                  e.ThemeURL,
		Background:                e.Background,
		BackgroundColor:           e.BackgroundColor,
		CustomIncomingBubbleColor: e.CustomIncomingBubbleColor,
		CustomOutgoingBubbleColor: e.CustomOutgoingBubbleColor,
		CustomIncomingTextColor:   e.CustomIncomingTextColor,
		CustomOutgoingTextColor:   e.CustomOutgoingTextColor,
		QuickReaction:             e.QuickReaction,
		CreatedBy:                 e.CreatedBy,
		CreatedAt:                 e.CreatedAt,
		UpdatedAt:                 e.UpdatedAt,
		LastMessageAt:             e.LastMessageAt,
		LastMessageID:             e.LastMessageID,
		LastMessageContent:        e.LastMessageContent,
		LastMessageSenderID:       e.LastMessageSenderID,
	}
}
