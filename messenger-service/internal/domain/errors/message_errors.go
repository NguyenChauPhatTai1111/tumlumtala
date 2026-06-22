package domainerrors

import "errors"

const (
	MsgSendMessageFailed      = "Gửi tin nhắn thất bại"
	MsgListMessagesFailed     = "Liệt kê tin nhắn thất bại"
	MsgMarkReadFailed         = "Đánh dấu tin nhắn là đã đọc thất bại"
	MsgGetUnreadCountFailed   = "Lấy số lượng tin nhắn chưa đọc thất bại"
	MsgGetLastMessageFailed   = "Lấy tin nhắn cuối cùng của cuộc trò chuyện thất bại"
	MsgInvalidMessageID       = "MessageID không hợp lệ"
	MsgUnSupportedMessageType = "Loại tin nhắn không được hỗ trợ"
	MsgInvalidPayload         = "Dữ liệu gửi lên không hợp lệ"
	MsgEmptyMessageContent    = "Nội dung tin nhắn không được rỗng"
	MsgNoChangeMessage        = "Nội dung tin nhắn không có thay đổi"
	MsgSetReactionFailed      = "Thả reaction thất bại"
	MsgRemoveReactionFailed   = "Gỡ reaction thất bại"
	MsgInvalidReaction        = "Reaction không hợp lệ"
	MsgUpdateMessageFailed    = "Cập nhật tin nhắn thất bại"
	MsgNotMessageOwner        = "Bạn không có quyền sửa tin nhắn này"
)

var (
	ErrGetUnreadCount      = errors.New(MsgGetUnreadCountFailed)
	ErrGetLastMessage      = errors.New(MsgGetLastMessageFailed)
	ErrSendMessage         = errors.New(MsgSendMessageFailed)
	ErrListMessages        = errors.New(MsgListMessagesFailed)
	ErrMarkRead            = errors.New(MsgMarkReadFailed)
	ErrInvalidMessageID    = errors.New(MsgInvalidMessageID)
	ErrEmptyMessageContent = errors.New(MsgEmptyMessageContent)
	ErrSetReaction         = errors.New(MsgSetReactionFailed)
	ErrRemoveReaction      = errors.New(MsgRemoveReactionFailed)
	ErrInvalidReaction     = errors.New(MsgInvalidReaction)
	ErrUpdateMessage       = errors.New(MsgUpdateMessageFailed)
	ErrNotMessageOwner     = errors.New(MsgNotMessageOwner)
	ErrNoChangeMessage     = errors.New(MsgNoChangeMessage)
)
