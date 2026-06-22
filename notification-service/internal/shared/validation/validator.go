package validation

import (
	"errors"

	apperrors "tumlumtala/notification-service/internal/shared/errors"

	"github.com/gin-gonic/gin"
)

func BindJSON(c *gin.Context, dst any) error {
	if err := c.ShouldBindJSON(dst); err != nil {
		return apperrors.New(apperrors.CodeBadRequest, "invalid request body", err)
	}
	return nil
}

func Required(value, field string) error {
	if value == "" {
		return apperrors.New(apperrors.CodeBadRequest, field+" is required", errors.New("missing field"))
	}
	return nil
}
