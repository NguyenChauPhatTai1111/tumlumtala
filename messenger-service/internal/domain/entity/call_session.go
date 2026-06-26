package entity

import "time"

type CallSession struct {
	ID             string     `json:"id"`
	ConversationID uint       `json:"conversation_id"`
	CallerID       uint       `json:"caller_id"`
	ReceiverID     uint       `json:"receiver_id"`
	CallType       string     `json:"call_type"`
	Status         string     `json:"status"`
	StartedAt      *time.Time `json:"started_at,omitempty"`
	EndedAt        *time.Time `json:"ended_at,omitempty"`
	Duration       int        `json:"duration_seconds"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
}
