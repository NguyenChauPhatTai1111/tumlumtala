package entity

import "time"

type Activity struct {
	ID             uint       `json:"id"`
	ConversationID uint       `json:"conversation_id"`
	ActorUserID    uint       `json:"actor_user_id"`
	TargetUserID   *uint      `json:"target_user_id,omitempty"`
	ActionType     string     `json:"action_type"`
	Content        string     `json:"content,omitempty"`
	MetaData       string     `json:"metadata,omitempty"`
	CreatedAt      *time.Time `json:"created_at,omitempty"`
}
