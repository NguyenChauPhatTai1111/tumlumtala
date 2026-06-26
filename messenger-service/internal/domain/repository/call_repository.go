package repository

import (
	"context"

	"github.com/tumlumtala/messenger-service/internal/domain/entity"
)

type CallSessionRepository interface {
	Create(ctx context.Context, call *entity.CallSession) error
	Get(ctx context.Context, id string) (*entity.CallSession, error)
	UpdateStatus(ctx context.Context, id string, status string) (*entity.CallSession, error)
	Start(ctx context.Context, id string) (*entity.CallSession, error)
	End(ctx context.Context, id string, status string) (*entity.CallSession, error)
	ListByConversation(ctx context.Context, conversationID uint, limit int) ([]entity.CallSession, error)
}
