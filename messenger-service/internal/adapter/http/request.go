package http

type CreateConversationRequest struct {
	IsGroup        bool   `json:"is_group"`
	Name           string `json:"name"`
	ParticipantIDs []uint `json:"participant_ids"`
}

type SendMessageRequest struct {
	ConversationID   uint                     `json:"conversation_id"`
	Content          string                   `json:"content"`
	MessageType      string                   `json:"message_type"`
	ItemID           *uint                    `json:"item_id,omitempty"`
	Messages         []SendMessageItemRequest `json:"messages,omitempty"`
	ReplyToMessageID *uint                    `json:"reply_to_message_id"`
	TempID           string                   `json:"temp_id,omitempty"`
}

type MessageMetadataRequest struct {
	OriginalName string `json:"original_name,omitempty"`
	Size         int64  `json:"size,omitempty"`
	MimeType     string `json:"mime_type,omitempty"`
	Duration     int64  `json:"duration,omitempty"`
}

type SendMessageItemRequest struct {
	Type     string                  `json:"type"`
	Content  string                  `json:"content"`
	ItemID   *uint                   `json:"item_id,omitempty"`
	Metadata *MessageMetadataRequest `json:"metadata,omitempty"`
}

type UpdateMessageRequest struct {
	Content string `json:"content" binding:"required"`
}

type SetReactionRequest struct {
	Reaction string `json:"reaction"`
}

type RenameConversationRequest struct {
	Name string `json:"name" binding:"required,min=1,max=100"`
}

type AddMembersRequest struct {
	UserIDs []uint `json:"user_ids" binding:"required,min=1"`
}

type ChangeBackgroundRequest struct {
	ThemeID                   uint    `json:"theme_id" form:"theme_id" binding:"required"`
	ThemeURL                  *string `json:"theme_url" form:"theme_url"`
	CustomIncomingBubbleColor string  `json:"custom_incoming_bubble_color" form:"custom_incoming_bubble_color"`
	CustomOutgoingBubbleColor string  `json:"custom_outgoing_bubble_color" form:"custom_outgoing_bubble_color"`
	CustomIncomingTextColor   string  `json:"custom_incoming_text_color" form:"custom_incoming_text_color"`
	CustomOutgoingTextColor   string  `json:"custom_outgoing_text_color" form:"custom_outgoing_text_color"`
}

type ToggleNotificationsRequest struct {
	Enabled bool `json:"enabled"`
}

type ChangeAvatarRequest struct {
	Avatar string `json:"avatar" form:"avatar"`
}

type SetNicknameRequest struct {
	Nickname string `json:"nickname" binding:"max=50"`
}

type SetQuickReactionRequest struct {
	QuickReaction string `json:"quick_reaction" binding:"required,max=10"`
}

type QueryFilter struct {
	Page   int    `form:"page"`
	Limit  int    `form:"limit"`
	Sort   string `form:"sort"`
	Order  string `form:"order"`
	Search string `form:"search"`
	Offset int    `form:"offset"`
}
