package model

import "time"

type UserConversationParticipant struct {
	ID                   uint `gorm:"primaryKey"`
	ConversationID       uint `gorm:"index"`
	UserID               uint `gorm:"index"`
	Role                 string
	Nickname             string
	NotificationsEnabled bool
	IsArchived           bool
	UnreadCount          int64
	CreatedAt            *time.Time
	LastReadAt           *time.Time
	LastReadSeq          *uint
	DeletedAt            *time.Time
	MessagesVisibleFrom  *time.Time
}

func (UserConversationParticipant) TableName() string {
	return "conversation_participants"
}
