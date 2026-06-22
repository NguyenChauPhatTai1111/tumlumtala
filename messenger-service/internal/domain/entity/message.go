package entity

import "time"

type UserMessage struct {
	ID               uint                 `json:"id"`
	ConversationID   uint                 `json:"conversation_id"`
	Seq              uint                 `json:"seq"`
	TempID           string               `json:"temp_id,omitempty"`
	SenderID         uint                 `json:"sender_id"`
	SenderName       string               `json:"sender_name,omitempty"`
	SenderGender     string               `json:"sender_gender,omitempty"`
	Content          string               `json:"content"`
	MessageType      string               `json:"message_type"`
	EmojiSourceType  string               `json:"emoji_source_type,omitempty"`
	ReplyToMessageID *uint                `json:"reply_to_message_id,omitempty"`
	ReplyToContent   *string              `json:"reply_to_content,omitempty"`
	ReplyToSenderID  *uint                `json:"reply_to_sender_id,omitempty"`
	Reactions        []MessageReaction    `json:"reactions,omitempty"`
	Histories        []UserMessageHistory `json:"histories,omitempty"`
	Metadata         string               `json:"metadata,omitempty"`
	CreatedAt        time.Time            `json:"created_at"`
	UpdatedAt        time.Time            `json:"updated_at"`
	DeletedAt        *time.Time           `json:"deleted_at,omitempty"`
}

func (UserMessage) TableName() string {
	return "messages"
}
