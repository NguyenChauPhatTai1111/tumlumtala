package httpctx

import (
	"errors"

	"github.com/gin-gonic/gin"
)

const KeyUserUUID = "userUUID"

func UserUUID(c *gin.Context) (string, error) {
	v := c.GetString(KeyUserUUID)
	if v == "" {
		return "", errors.New("unauthorized")
	}
	return v, nil
}
