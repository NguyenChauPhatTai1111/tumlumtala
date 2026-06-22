package domainerrors

import "errors"

const (
	MsgCreateConversationFailed    = "Tạo cuộc trò chuyện thất bại"
	MsgGetConversationFailed       = "Lấy cuộc trò chuyện thất bại"
	MsgListConversationsFailed     = "Liệt kê cuộc trò chuyện thất bại"
	MsgDeleteConversationFailed    = "Xóa cuộc trò chuyện thất bại"
	MsgArchiveConversationFailed   = "Lưu trữ cuộc trò chuyện thất bại"
	MsgUnarchiveConversationFailed = "Hủy lưu trữ cuộc trò chuyện thất bại"
	MsgNotInConversation           = "Bạn không thuộc cuộc trò chuyện này"
	MsgInvalidConversationID       = "ConversationID không hợp lệ"
	MsgCannotJoinConversation      = "Không thể tham gia cuộc trò chuyện"
	MsgInvalidUserID               = "UserID không hợp lệ"
	MsgInvalidParticipantIDs       = "Danh sách ParticipantIDs không hợp lệ"
	MsgConversationNotFound        = "Cuộc trò chuyện không tồn tại"
	MsgNotParticipant              = "Bạn không phải là thành viên của cuộc trò chuyện"
	MsgNotGroupConversation        = "Đây không phải là cuộc trò chuyện nhóm"
	MsgFailedToUploadAsset         = "Không thể tải lên tệp đính kèm"
	MsgPermissionDenied            = "Bạn không có quyền thực hiện hành động này"
	MsgCannotRemoveSelf            = "Bạn không thể tự xóa mình khỏi nhóm"
)

var (
	ErrCreateConversation     = errors.New(MsgCreateConversationFailed)
	ErrGetConversation        = errors.New(MsgGetConversationFailed)
	ErrListConversations      = errors.New(MsgListConversationsFailed)
	ErrDeleteConversation     = errors.New(MsgDeleteConversationFailed)
	ErrArchiveConversation    = errors.New(MsgArchiveConversationFailed)
	ErrUnarchiveConversation  = errors.New(MsgUnarchiveConversationFailed)
	ErrNotInConversation      = errors.New(MsgNotInConversation)
	ErrInvalidConversationID  = errors.New(MsgInvalidConversationID)
	ErrCannotJoinConversation = errors.New(MsgCannotJoinConversation)
	ErrInvalidUserID          = errors.New(MsgInvalidUserID)
	ErrInvalidParticipantIDs  = errors.New(MsgInvalidParticipantIDs)
	ErrConversationNotFound   = errors.New(MsgConversationNotFound)
	ErrNotParticipant         = errors.New(MsgNotParticipant)
	ErrNotGroupConversation   = errors.New(MsgNotGroupConversation)
	ErrFailedToUploadAsset    = errors.New(MsgFailedToUploadAsset)
	ErrPermissionDenied       = errors.New(MsgPermissionDenied)
	ErrCannotRemoveSelf       = errors.New(MsgCannotRemoveSelf)
)
