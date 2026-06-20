package redis

import (
	"context"
	"time"

	"github.com/redis/go-redis/v9"
)

const blacklistPrefix = "blacklist:"

type BlacklistStore struct {
	client *redis.Client
}

func NewBlacklistStore(client *redis.Client) *BlacklistStore {
	return &BlacklistStore{client: client}
}

func (s *BlacklistStore) Add(ctx context.Context, jti string, ttl time.Duration) error {
	return s.client.Set(ctx, blacklistPrefix+jti, 1, ttl).Err()
}

func (s *BlacklistStore) IsBlocked(ctx context.Context, jti string) (bool, error) {
	err := s.client.Get(ctx, blacklistPrefix+jti).Err()
	if err == nil {
		return true, nil
	}
	if err == redis.Nil {
		return false, nil
	}
	return false, err
}
