package redis

import (
	"context"
	"time"

	"github.com/redis/go-redis/v9"
	domainerrors "github.com/tumlumtala/auth-service/internal/domain/errors"
)

const (
	webAuthnChallengePrefix = "webauthn:challenge:"
	challengeTTL            = 5 * time.Minute
)

// WebAuthnChallengeStore persists serialised WebAuthn session data (challenge)
// keyed by a caller-supplied session ID.
type WebAuthnChallengeStore struct {
	client *redis.Client
}

func NewWebAuthnChallengeStore(client *redis.Client) *WebAuthnChallengeStore {
	return &WebAuthnChallengeStore{client: client}
}

func (s *WebAuthnChallengeStore) Save(ctx context.Context, sessionID string, data []byte) error {
	return s.client.Set(ctx, webAuthnChallengePrefix+sessionID, data, challengeTTL).Err()
}

func (s *WebAuthnChallengeStore) Get(ctx context.Context, sessionID string) ([]byte, error) {
	data, err := s.client.Get(ctx, webAuthnChallengePrefix+sessionID).Bytes()
	if err != nil {
		if err == redis.Nil {
			return nil, domainerrors.ErrSessionNotFound
		}
		return nil, err
	}
	return data, nil
}

func (s *WebAuthnChallengeStore) Delete(ctx context.Context, sessionID string) error {
	return s.client.Del(ctx, webAuthnChallengePrefix+sessionID).Err()
}
