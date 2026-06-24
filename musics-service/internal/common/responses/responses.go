package responses

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type APIResponse struct {
	Status     string `json:"status"`
	Message    string `json:"message,omitempty"`
	Data       any    `json:"data,omitempty"`
	Pagination any    `json:"pagination,omitempty"`
}

type ResponseData struct {
	Data       any `json:"data"`
	Pagination any `json:"pagination,omitempty"`
}

type AppError struct {
	Message string
	Code    int
}

func (e *AppError) Error() string { return e.Message }

func NewError(message string, code int) error {
	return &AppError{Message: message, Code: code}
}

func ResponseSuccess(ctx *gin.Context, status int, message string, payload ...ResponseData) {
	resp := APIResponse{
		Status:  "success",
		Message: message,
	}
	if len(payload) > 0 {
		resp.Data = payload[0].Data
		resp.Pagination = payload[0].Pagination
	}
	ctx.JSON(status, resp)
}

func ResponseValidator(ctx *gin.Context, data any) {
	ctx.JSON(http.StatusBadRequest, gin.H{"status": "error", "errors": data})
}

func ResponseError(ctx *gin.Context, err error) {
	if appErr, ok := err.(*AppError); ok {
		ctx.JSON(appErr.Code, gin.H{"status": "error", "message": appErr.Message})
		return
	}
	ctx.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": err.Error()})
}

func ErrUnauthorized(msg string) error { return &AppError{Message: msg, Code: http.StatusUnauthorized} }
func ErrBadRequest(msg string) error   { return &AppError{Message: msg, Code: http.StatusBadRequest} }
func ErrNotFound(msg string) error     { return &AppError{Message: msg, Code: http.StatusNotFound} }
func ErrInternal(msg string) error {
	return &AppError{Message: msg, Code: http.StatusInternalServerError}
}
