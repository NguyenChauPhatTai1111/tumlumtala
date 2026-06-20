package redis

import (
	"context"
	"strconv"

	"github.com/redis/go-redis/v9"
)

const tokenVersionPrefix = "token_version:"

type TokenVersionStore struct {
	client *redis.Client
}

func NewTokenVersionStore(client *redis.Client) *TokenVersionStore {
	return &TokenVersionStore{client: client}
}

func (s *TokenVersionStore) Get(ctx context.Context, userUUID string) (int64, error) {
	val, err := s.client.Get(ctx, tokenVersionPrefix+userUUID).Result()
	if err == redis.Nil {
		return 0, nil
	}
	if err != nil {
		return 0, err
	}
	return strconv.ParseInt(val, 10, 64)
}

func (s *TokenVersionStore) Increment(ctx context.Context, userUUID string) error {
	return s.client.Incr(ctx, tokenVersionPrefix+userUUID).Err()
}
