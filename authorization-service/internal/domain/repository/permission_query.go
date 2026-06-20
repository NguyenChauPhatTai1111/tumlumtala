package repository

import "context"

type PermissionQuery interface {
	// GetPermissionsByUserUUID trả danh sách permission codes của user (từ DB).
	GetPermissionsByUserUUID(ctx context.Context, userUUID string) ([]string, error)
}
