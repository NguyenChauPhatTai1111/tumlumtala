package activityDTO

import "time"

type CreateActivityInput struct {
	ConversationID uint
	ActorUserID    uint
	TargetUserID   *uint
	ActionType     string
	Content        string
	MetaData       string
}

type CreateActivityOutput struct {
	ID             uint       `json:"id"`
	ConversationID uint       `json:"conversation_id"`
	UserID         uint       `json:"user_id"`
	ActionType     string     `json:"action_type"`
	MetaData       string     `json:"metadata,omitempty"`
	Content        string     `json:"content"`
	CreatedAt      *time.Time `json:"created_at,omitempty"`
}
