package middleware

import (
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// AuthMiddleware reads the X-User-ID header injected by the gateway (which has already
// verified the JWT). The header value is a UUID; it is resolved to the numeric user_id
// from user_snapshots and stored in the Gin context for downstream handlers.
func AuthMiddleware(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		uuid := c.GetHeader("X-User-ID")
		if uuid == "" {
			c.JSON(401, gin.H{"success": false, "message": "Unauthorized"})
			c.Abort()
			return
		}

		var row struct {
			ID     uint64 `gorm:"column:id"`
			Status string `gorm:"column:status"`
		}
		if err := db.Raw("SELECT id, status FROM user_snapshots WHERE uuid = ? LIMIT 1", uuid).Scan(&row).Error; err != nil || row.ID == 0 || row.Status != "active" {
			c.JSON(401, gin.H{"success": false, "message": "Unauthorized"})
			c.Abort()
			return
		}

		c.Set("user_id", uint(row.ID))
		// Expose numeric ID as header so internal handlers can read it easily
		c.Request.Header.Set("X-User-ID", strconv.FormatUint(row.ID, 10))
		c.Next()
	}
}
