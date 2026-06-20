package redis

import (
	"context"
	"encoding/json"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/tumlumtala/auth-service/internal/domain/entity"
	domainerrors "github.com/tumlumtala/auth-service/internal/domain/errors"
)

const sessionPrefix = "session:"

type SessionStore struct {
	client *redis.Client
}

func NewSessionStore(client *redis.Client) *SessionStore {
	return &SessionStore{client: client}
}

// Save lưu session theo jti của refresh token (không phải raw token string).
func (s *SessionStore) Save(ctx context.Context, jti string, session entity.Session, ttl time.Duration) error {
	data, err := json.Marshal(session)
	if err != nil {
		return err
	}
	return s.client.Set(ctx, sessionPrefix+jti, data, ttl).Err()
}

func (s *SessionStore) Get(ctx context.Context, jti string) (*entity.Session, error) {
	data, err := s.client.Get(ctx, sessionPrefix+jti).Bytes()
	if err != nil {
		if err == redis.Nil {
			return nil, domainerrors.ErrSessionNotFound
		}
		return nil, err
	}
	var session entity.Session
	if err := json.Unmarshal(data, &session); err != nil {
		return nil, err
	}
	return &session, nil
}

func (s *SessionStore) Delete(ctx context.Context, jti string) error {
	result, err := s.client.Del(ctx, sessionPrefix+jti).Result()
	if err != nil {
		return err
	}
	if result == 0 {
		return domainerrors.ErrSessionNotFound
	}
	return nil
}
