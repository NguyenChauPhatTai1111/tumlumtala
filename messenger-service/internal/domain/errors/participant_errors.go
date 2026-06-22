package domainerrors

import "errors"

const (
	MsgGetConversationParticipantsFailed       = "Lấy người tham gia cuộc trò chuyện thất bại"
	MsgAddConversationParticipantFailed        = "Thêm người tham gia cuộc trò chuyện thất bại"
	MsgRemoveConversationParticipantFailed     = "Xóa người tham gia cuộc trò chuyện thất bại"
	MsgUpdateConversationParticipantRoleFailed = "Cập nhật vai trò người tham gia cuộc trò chuyện thất bại"
	MsgGetConversationParticipantFailed        = "Lấy người tham gia cuộc trò chuyện thất bại"
	MsgUserNotFound                            = "Người dùng không tồn tại"
)

var (
	ErrGetConversationParticipants       = errors.New(MsgGetConversationParticipantsFailed)
	ErrAddConversationParticipant        = errors.New(MsgAddConversationParticipantFailed)
	ErrRemoveConversationParticipant     = errors.New(MsgRemoveConversationParticipantFailed)
	ErrUpdateConversationParticipantRole = errors.New(MsgUpdateConversationParticipantRoleFailed)
	ErrGetConversationParticipant        = errors.New(MsgGetConversationParticipantFailed)
	ErrUserNotFound                      = errors.New(MsgUserNotFound)
)
