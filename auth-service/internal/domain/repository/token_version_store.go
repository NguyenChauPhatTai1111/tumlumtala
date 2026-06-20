package repository

import "context"

// TokenVersionStore quản lý version của token theo từng user.
// Khi increment, tất cả access token cũ của user đó đều bị vô hiệu.
type TokenVersionStore interface {
	// Get trả về version hiện tại. Nếu chưa có, trả về 0.
	Get(ctx context.Context, userUUID string) (int64, error)
	// Increment tăng version lên 1, dùng khi muốn kick toàn bộ thiết bị.
	Increment(ctx context.Context, userUUID string) error
}
