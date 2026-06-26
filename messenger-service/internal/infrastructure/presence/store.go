package presence

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

const (
	presenceTTL    = 60 * time.Second
	connKeyPrefix  = "presence:conn:"
	userKeyPrefix  = "presence:user:"
)

type Store struct {
	rdb *redis.Client
}

func NewStore(rdb *redis.Client) *Store {
	return &Store{rdb: rdb}
}

// SetOnline đánh dấu connection active và tăng đếm connections của user.
func (s *Store) SetOnline(ctx context.Context, connID string, userID uint) error {
	pipe := s.rdb.Pipeline()
	connKey := connKeyPrefix + connID
	userKey := userKeyPrefix + fmt.Sprintf("%d", userID)

	pipe.Set(ctx, connKey, userID, presenceTTL)
	pipe.Incr(ctx, userKey)
	pipe.Expire(ctx, userKey, presenceTTL)
	_, err := pipe.Exec(ctx)
	return err
}

// Heartbeat gia hạn TTL cho connection và user key.
func (s *Store) Heartbeat(ctx context.Context, connID string, userID uint) error {
	pipe := s.rdb.Pipeline()
	pipe.Expire(ctx, connKeyPrefix+connID, presenceTTL)
	pipe.Expire(ctx, userKeyPrefix+fmt.Sprintf("%d", userID), presenceTTL)
	_, err := pipe.Exec(ctx)
	return err
}

// SetOffline xóa connection và giảm đếm. Trả về true nếu user không còn connection nào.
func (s *Store) SetOffline(ctx context.Context, connID string, userID uint) (userOffline bool, err error) {
	connKey := connKeyPrefix + connID
	userKey := userKeyPrefix + fmt.Sprintf("%d", userID)

	if err = s.rdb.Del(ctx, connKey).Err(); err != nil {
		return false, err
	}

	count, err := s.rdb.Decr(ctx, userKey).Result()
	if err != nil {
		return false, err
	}

	if count <= 0 {
		s.rdb.Del(ctx, userKey)
		return true, nil
	}
	return false, nil
}

// IsOnline kiểm tra user có đang online không.
func (s *Store) IsOnline(ctx context.Context, userID uint) (bool, error) {
	count, err := s.rdb.Get(ctx, userKeyPrefix+fmt.Sprintf("%d", userID)).Int64()
	if err == redis.Nil {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

// GetOnlineUserIDs trả về subset của userIDs đang online.
func (s *Store) GetOnlineUserIDs(ctx context.Context, userIDs []uint) ([]uint, error) {
	if len(userIDs) == 0 {
		return nil, nil
	}
	pipe := s.rdb.Pipeline()
	cmds := make([]*redis.StringCmd, len(userIDs))
	for i, id := range userIDs {
		cmds[i] = pipe.Get(ctx, userKeyPrefix+fmt.Sprintf("%d", id))
	}
	if _, err := pipe.Exec(ctx); err != nil && err != redis.Nil {
		return nil, err
	}
	var online []uint
	for i, cmd := range cmds {
		v, err := cmd.Int64()
		if err == nil && v > 0 {
			online = append(online, userIDs[i])
		}
	}
	return online, nil
}
