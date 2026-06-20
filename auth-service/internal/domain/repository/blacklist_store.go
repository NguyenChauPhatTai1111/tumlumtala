package repository

import (
	"context"
	"time"
)

// BlacklistStore revoke từng access token đơn lẻ bằng jti.
// Mỗi entry tự hết hạn theo TTL bằng thời gian còn lại của token.
type BlacklistStore interface {
	// Add chặn token với jti này cho đến khi nó hết hạn tự nhiên.
	Add(ctx context.Context, jti string, ttl time.Duration) error
	// IsBlocked kiểm tra O(1) xem jti đã bị chặn chưa.
	IsBlocked(ctx context.Context, jti string) (bool, error)
}
