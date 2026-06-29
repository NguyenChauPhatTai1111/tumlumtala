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

	// Group call participant management
	AddParticipant(ctx context.Context, p *entity.CallParticipant) error
	GetParticipants(ctx context.Context, callID string) ([]entity.CallParticipant, error)
	UpdateParticipantStatus(ctx context.Context, callID string, userID uint, status string) error
	CountActiveParticipants(ctx context.Context, callID string) (int, error)
	GetActiveGroupCall(ctx context.Context, conversationID uint) (*entity.CallSession, error)
}
