package messageDTO

import (
	"time"

	activityDTO "github.com/tumlumtala/messenger-service/internal/application/dto/activity"
	historyDTO "github.com/tumlumtala/messenger-service/internal/application/dto/history"
)

type ReactionCountDTO struct {
	UserID uint   `json:"user_id"`
	Emoji  string `json:"emoji"`
}

type FileMetadata struct {
	OriginalName string `json:"original_name,omitempty"`
	Size         int64  `json:"size,omitempty"`
	MimeType     string `json:"mime_type,omitempty"`
	Duration     int64  `json:"duration,omitempty"`
}

type MessageDTO struct {
	ID               uint                              `json:"id"`
	ConversationID   uint                              `json:"conversation_id"`
	Seq              uint                              `json:"seq"`
	SenderID         uint                              `json:"sender_id"`
	SenderName       string                            `json:"sender_name,omitempty"`
	SenderGender     string                            `json:"sender_gender,omitempty"`
	Content          string                            `json:"content"`
	MessageType      string                            `json:"message_type"`
	TempID           string                            `json:"temp_id,omitempty"`
	EmojiSourceType  string                            `json:"emoji_source_type,omitempty"`
	ReplyToMessageID *uint                             `json:"reply_to_message_id,omitempty"`
	ReplyToContent   *string                           `json:"reply_to_content,omitempty"`
	ReplyToSenderID  *uint                             `json:"reply_to_sender_id,omitempty"`
	Reactions        []ReactionCountDTO                `json:"reactions,omitempty"`
	Histories        []historyDTO.MessageHistoryDTO    `json:"histories,omitempty"`
	Activity         *activityDTO.CreateActivityOutput `json:"activities,omitempty"`
	Metadata         *FileMetadata                     `json:"metadata,omitempty"`
	IsUpdated        bool                              `json:"is_updated"`
	CreatedAt        time.Time                         `json:"created_at"`
	UpdatedAt        time.Time                         `json:"updated_at"`
}

type SendMessageInput struct {
	ConversationID   uint          `json:"conversation_id"`
	SenderID         uint          `json:"sender_id"`
	Content          string        `json:"content"`
	MessageType      string        `json:"message_type"`
	ItemID           *uint         `json:"item_id,omitempty"`
	EmojiSourceType  string        `json:"emoji_source_type,omitempty"`
	ReplyToMessageID *uint         `json:"reply_to_message_id"`
	TempID           string        `json:"temp_id,omitempty"`
	FileMetadata     *FileMetadata `json:"metadata,omitempty"`
}

type SendMessageOutput struct {
	ID               uint          `json:"id"`
	ConversationID   uint          `json:"conversation_id"`
	Seq              uint          `json:"seq"`
	TempID           string        `json:"temp_id,omitempty"`
	SenderID         uint          `json:"sender_id"`
	SenderName       string        `json:"sender_name,omitempty"`
	Content          string        `json:"content"`
	MessageType      string        `json:"message_type"`
	EmojiSourceType  string        `json:"emoji_source_type,omitempty"`
	ReplyToMessageID *uint         `json:"reply_to_message_id,omitempty"`
	Metadata         *FileMetadata `json:"metadata,omitempty"`
	CreatedAt        string        `json:"created_at"`
	UpdatedAt        string        `json:"updated_at"`
}

type UpdateMessageInput struct {
	MessageID uint   `json:"message_id"`
	UserID    uint   `json:"user_id"`
	Content   string `json:"content"`
}

type UpdateMessageOutput struct {
	ID             uint   `json:"id"`
	ConversationID uint   `json:"conversation_id"`
	Seq            uint   `json:"seq"`
	SenderID       uint   `json:"sender_id"`
	SenderName     string `json:"sender_name,omitempty"`
	Content        string `json:"content"`
	UpdatedAt      string `json:"updated_at"`
}

type SetReactionInput struct {
	MessageID uint   `json:"message_id"`
	UserID    uint   `json:"user_id"`
	Reaction  string `json:"reaction"`
}

type SetReactionOutput struct {
	MessageID      uint   `json:"message_id"`
	ConversationID uint   `json:"conversation_id"`
	UserID         uint   `json:"user_id"`
	Reaction       string `json:"reaction"`
}

type RemoveReactionInput struct {
	MessageID uint `json:"message_id"`
	UserID    uint `json:"user_id"`
}

type RemoveReactionOutput struct {
	MessageID      uint `json:"message_id"`
	ConversationID uint `json:"conversation_id"`
	UserID         uint `json:"user_id"`
}

type SearchMessagesRequest struct {
	Query  string `form:"query" validate:"required,min=1"`
	Limit  int    `form:"limit" validate:"min=1,max=100"`
	Offset int    `form:"offset" validate:"min=0"`
}
