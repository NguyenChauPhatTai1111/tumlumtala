package response

import (
	"github.com/gin-gonic/gin"
	apperrors "github.com/tumlumtala/gateway/internal/shared/errors"
)

type SuccessResponse struct {
	Success bool `json:"success"`
	Data    any  `json:"data"`
}

type ErrorBody struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

type ErrorResponse struct {
	Success bool      `json:"success"`
	Error   ErrorBody `json:"error"`
}

func OK(c *gin.Context, status int, data any) {
	c.JSON(status, SuccessResponse{Success: true, Data: data})
}

func Error(c *gin.Context, err error) {
	appErr := apperrors.FromError(err)
	c.JSON(apperrors.HTTPStatus(appErr), ErrorResponse{
		Success: false,
		Error: ErrorBody{
			Code:    appErr.Code,
			Message: appErr.Message,
		},
	})
}

func ErrorCode(c *gin.Context, status int, code, message string) {
	c.JSON(status, ErrorResponse{
		Success: false,
		Error: ErrorBody{
			Code:    code,
			Message: message,
		},
	})
}
