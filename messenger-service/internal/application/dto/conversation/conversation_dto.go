package conversationDTO

import (
	"time"

	"github.com/tumlumtala/messenger-service/internal/domain/entity"
)

type ParticipantInfo = entity.ParticipantInfo

type ConversationThemeDTO struct {
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

type ConversationDTO struct {
	ID                        uint                  `json:"id"`
	IsGroup                   bool                  `json:"is_group"`
	IsArchived                bool                  `json:"is_archived"`
	Name                      string                `json:"name,omitempty"`
	Avatar                    string                `json:"avatar"`
	ThemeID                   *uint                 `json:"theme_id,omitempty"`
	ThemeURL                  string                `json:"theme_url,omitempty"`
	Theme                     *ConversationThemeDTO `json:"theme,omitempty"`
	Background                string                `json:"background,omitempty"`
	BackgroundColor           string                `json:"background_color,omitempty"`
	CustomIncomingBubbleColor string                `json:"custom_incoming_bubble_color,omitempty"`
	CustomOutgoingBubbleColor string                `json:"custom_outgoing_bubble_color,omitempty"`
	CustomIncomingTextColor   string                `json:"custom_incoming_text_color,omitempty"`
	CustomOutgoingTextColor   string                `json:"custom_outgoing_text_color,omitempty"`
	NotificationsEnabled      bool                  `json:"notifications_enabled"`
	CreatedAt                 time.Time             `json:"created_at"`
	CreatedBy                 uint                  `json:"created_by"`
	UnreadCount               int64                 `json:"unread_count"`
	LastMessageAt             *time.Time            `json:"last_message_at,omitempty"`
	LastMessageID             *uint                 `json:"last_message_id,omitempty"`
	LastMessageContent        string                `json:"last_message_content,omitempty"`
	LastMessageSenderID       *uint                 `json:"last_message_sender_id,omitempty"`
	LastMessageType           string                `json:"last_message_type,omitempty"`
	EmojiSourceType           string                `json:"emoji_source_type,omitempty"`
	QuickReaction             string                `json:"quick_reaction,omitempty"`
	LastReadMessageID         *uint                 `json:"last_read_message_id,omitempty"`
	LastMessageSenderName     string                `json:"last_message_sender_name,omitempty"`
	Participants              []ParticipantInfo     `json:"participants"`
}

type CreateConversationInput struct {
	UserID         uint
	IsGroup        bool
	Name           string
	ParticipantIDs []uint
}

type CreateConversationOutput struct {
	ID             uint   `json:"id"`
	IsGroup        bool   `json:"is_group"`
	Name           string `json:"name,omitempty"`
	CreatedBy      uint   `json:"created_by"`
	ParticipantIDs []uint `json:"participant_ids"`
}

type AddMembersRequest struct {
	UserIDs []uint `json:"user_ids" validate:"required,min=1"`
}

type ChangeAvatarRequest struct {
	Avatar string `json:"avatar" validate:"required"`
}

type ChangeBackgroundRequest struct {
	ThemeID                   *uint
	ThemeURL                  *string
	Background                string
	BackgroundColor           string
	CustomIncomingBubbleColor string
	CustomOutgoingBubbleColor string
	CustomIncomingTextColor   string
	CustomOutgoingTextColor   string
}

type RenameConversationRequest struct {
	Name string `json:"name" validate:"required,min=1,max=100"`
}

type SetNicknameRequest struct {
	Nickname string `json:"nickname" validate:"max=50"`
}

type SetQuickReactionRequest struct {
	QuickReaction string `json:"quick_reaction"`
}

type ToggleNotificationsRequest struct {
	Enabled bool `json:"enabled"`
}
