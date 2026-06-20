package queryservice

import (
	"context"

	"gorm.io/gorm"
)

type MySQLPermissionQuery struct{ db *gorm.DB }

func NewMySQLPermissionQuery(db *gorm.DB) *MySQLPermissionQuery {
	return &MySQLPermissionQuery{db: db}
}

func (q *MySQLPermissionQuery) GetPermissionsByUserUUID(ctx context.Context, userUUID string) ([]string, error) {
	var codes []string
	err := q.db.WithContext(ctx).Raw(`
		SELECT DISTINCT p.code
		FROM user_roles ur
		JOIN role_permissions rp ON rp.role_id = ur.role_id
		JOIN permissions p ON p.id = rp.permission_id
		WHERE ur.user_uuid = ?
	`, userUUID).Scan(&codes).Error
	return codes, err
}
