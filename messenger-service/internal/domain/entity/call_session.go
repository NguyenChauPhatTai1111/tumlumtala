package entity

import "time"

const GroupCallMaxParticipants = 8

type CallSession struct {
	ID              string     `json:"id"`
	ConversationID  uint       `json:"conversation_id"`
	CallerID        uint       `json:"caller_id"`
	ReceiverID      uint       `json:"receiver_id,omitempty"` // 0 for group calls
	CallType        string     `json:"call_type"`
	Status          string     `json:"status"`
	IsGroup         bool       `json:"is_group"`
	MaxParticipants int        `json:"max_participants"`
	StartedAt       *time.Time `json:"started_at,omitempty"`
	EndedAt         *time.Time `json:"ended_at,omitempty"`
	Duration        int        `json:"duration_seconds"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
}

type CallParticipant struct {
	ID       uint64     `json:"id"`
	CallID   string     `json:"call_id"`
	UserID   uint       `json:"user_id"`
	Status   string     `json:"status"`
	JoinedAt *time.Time `json:"joined_at,omitempty"`
	LeftAt   *time.Time `json:"left_at,omitempty"`
}
