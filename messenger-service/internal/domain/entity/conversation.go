package entity

import "time"

type ConversationTheme struct {
	ID                  uint   `json:"id"`
	PresetID            string `json:"preset_id"`
	Name                string `json:"name"`
	Background          string `json:"background"`
	BackgroundColor     string `json:"background_color"`
	IncomingBubbleColor string `json:"incoming_bubble_color"`
	OutgoingBubbleColor string `json:"outgoing_bubble_color"`
	IncomingTextColor   string `json:"incoming_text_color"`
	OutgoingTextColor   string `json:"outgoing_text_color"`
}

type UserConversation struct {
	ID                        uint               `json:"id"`
	IsGroup                   bool               `json:"is_group"`
	IsArchived                bool               `json:"is_archived"`
	Name                      string             `json:"name,omitempty"`
	Avatar                    string             `json:"avatar,omitempty"`
	ThemeID                   *uint              `json:"theme_id,omitempty"`
	ThemeURL                  string             `json:"theme_url,omitempty"`
	Theme                     *ConversationTheme `json:"theme,omitempty"`
	Background                string             `json:"background,omitempty"`
	BackgroundColor           string             `json:"background_color,omitempty"`
	CustomIncomingBubbleColor string             `json:"custom_incoming_bubble_color,omitempty"`
	CustomOutgoingBubbleColor string             `json:"custom_outgoing_bubble_color,omitempty"`
	CustomIncomingTextColor   string             `json:"custom_incoming_text_color,omitempty"`
	CustomOutgoingTextColor   string             `json:"custom_outgoing_text_color,omitempty"`
	NotificationsEnabled      bool               `json:"notifications_enabled"`
	CreatedBy                 uint               `json:"created_by"`
	CreatedAt                 time.Time          `json:"created_at"`
	UpdatedAt                 time.Time          `json:"updated_at"`
	LastMessageAt             *time.Time         `json:"last_message_at,omitempty"`
	LastMessageID             *uint              `json:"last_message_id,omitempty"`
	LastMessageContent        string             `json:"last_message_content,omitempty"`
	LastMessageSenderID       *uint              `json:"last_message_sender_id,omitempty"`
	LastMessageSenderName     string             `json:"last_message_sender_name,omitempty"`
	LastMessageType           string             `json:"last_message_type,omitempty"`
	LastMessageActivityType   string             `json:"last_message_activity_type,omitempty"`
	LastMessageMetadata       string             `json:"last_message_metadata,omitempty"`
	EmojiSourceType           string             `json:"emoji_source_type,omitempty"`
	QuickReaction             string             `json:"quick_reaction,omitempty"`
	UnreadCount               int64              `json:"unread_count"`
	LastReadMessageID         *uint              `json:"last_read_message_id,omitempty"`
	Participants              []ParticipantInfo  `json:"participants,omitempty" gorm:"-"`
}

func (UserConversation) TableName() string {
	return "conversations"
}
