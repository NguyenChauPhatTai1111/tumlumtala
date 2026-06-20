package repository

import (
	"context"
	"time"

	"github.com/tumlumtala/auth-service/internal/domain/entity"
)

type SessionStore interface {
	Save(ctx context.Context, refreshToken string, session entity.Session, ttl time.Duration) error
	Get(ctx context.Context, refreshToken string) (*entity.Session, error)
	Delete(ctx context.Context, refreshToken string) error
}
