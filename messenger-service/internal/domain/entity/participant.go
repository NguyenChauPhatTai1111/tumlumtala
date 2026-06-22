package entity

import "time"

type ParticipantInfo struct {
	ID          uint       `json:"id"`
	FullName    string     `json:"fullname"`
	Email       string     `json:"email"`
	Avatar      string     `json:"avatar"`
	Gender      string     `json:"gender"`
	Nickname    string     `json:"nickname,omitempty"`
	Role        string     `json:"role"`
	LastReadAt  *time.Time `json:"last_read_at,omitempty"`
	LastReadSeq *uint      `json:"last_read_seq,omitempty"`
}

type UserConversationParticipant struct {
	ID                   uint       `json:"id"`
	ConversationID       uint       `json:"conversation_id"`
	UserID               uint       `json:"user_id"`
	Role                 string     `json:"role"`
	Nickname             string     `json:"nickname,omitempty"`
	NotificationsEnabled bool       `json:"notifications_enabled"`
	IsArchived           bool       `json:"is_archived"`
	CreatedAt            *time.Time `json:"created_at,omitempty"`
	LastReadAt           *time.Time `json:"last_read_at,omitempty"`
	LastReadSeq          *uint      `json:"last_read_seq,omitempty"`
}

func (UserConversationParticipant) TableName() string {
	return "conversation_participants"
}
