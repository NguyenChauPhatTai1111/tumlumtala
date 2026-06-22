package http

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

type APIResponse struct {
	Success bool        `json:"success"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

type APIError struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	Code    string `json:"code,omitempty"`
}

type ReadReceiptResponse struct {
	ConversationID uint      `json:"conversation_id"`
	UserID         uint      `json:"user_id"`
	ReadAt         time.Time `json:"read_at"`
}

func ResponseSuccess(c *gin.Context, status int, message string, data interface{}) {
	c.JSON(status, APIResponse{Success: true, Message: message, Data: data})
}

func ResponseError(c *gin.Context, status int, message string) {
	c.JSON(status, APIError{Success: false, Message: message})
	c.Abort()
}

func ResponseBadRequest(c *gin.Context, message string) {
	ResponseError(c, http.StatusBadRequest, message)
}

func ResponseUnauthorized(c *gin.Context) {
	ResponseError(c, http.StatusUnauthorized, "Unauthorized")
}

func ResponseForbidden(c *gin.Context, message string) {
	ResponseError(c, http.StatusForbidden, message)
}

func ResponseNotFound(c *gin.Context, message string) {
	ResponseError(c, http.StatusNotFound, message)
}

func ResponseInternalError(c *gin.Context) {
	ResponseError(c, http.StatusInternalServerError, "Internal server error")
}

// mapDomainError converts a domain error to an HTTP status code and message.
func mapDomainError(err error) (int, string) {
	if err == nil {
		return http.StatusOK, ""
	}
	msg := err.Error()
	switch msg {
	case "Bạn không thuộc cuộc trò chuyện này",
		"Bạn không phải là thành viên của cuộc trò chuyện",
		"Bạn không có quyền thực hiện hành động này",
		"Bạn không thể tự xóa mình khỏi nhóm":
		return http.StatusForbidden, msg
	case "Cuộc trò chuyện không tồn tại",
		"Người dùng không tồn tại":
		return http.StatusNotFound, msg
	case "ConversationID không hợp lệ",
		"UserID không hợp lệ",
		"Danh sách ParticipantIDs không hợp lệ",
		"MessageID không hợp lệ",
		"Dữ liệu gửi lên không hợp lệ",
		"Nội dung tin nhắn không được rỗng",
		"Reaction không hợp lệ",
		"Đây không phải là cuộc trò chuyện nhóm":
		return http.StatusBadRequest, msg
	default:
		return http.StatusInternalServerError, msg
	}
}

// ResponseDomainError maps a domain error and writes the appropriate HTTP response.
func ResponseDomainError(c *gin.Context, err error) {
	status, msg := mapDomainError(err)
	ResponseError(c, status, msg)
}
