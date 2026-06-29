package repository

import (
	"context"
	"time"

	"github.com/tumlumtala/messenger-service/internal/domain/entity"
	domainrepo "github.com/tumlumtala/messenger-service/internal/domain/repository"
	"github.com/tumlumtala/messenger-service/internal/infrastructure/persistence/model"
	"gorm.io/gorm"
)

type callSessionRepository struct {
	db *gorm.DB
}

func NewCallSessionRepository(db *gorm.DB) domainrepo.CallSessionRepository {
	return &callSessionRepository{db: db}
}

func (r *callSessionRepository) Create(ctx context.Context, call *entity.CallSession) error {
	return r.db.WithContext(ctx).Create(model.CallSessionFromEntity(call)).Error
}

func (r *callSessionRepository) Get(ctx context.Context, id string) (*entity.CallSession, error) {
	var m model.CallSession
	if err := r.db.WithContext(ctx).First(&m, "id = ?", id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}
	return m.ToEntity(), nil
}

func (r *callSessionRepository) UpdateStatus(ctx context.Context, id string, status string) (*entity.CallSession, error) {
	if err := r.db.WithContext(ctx).
		Model(&model.CallSession{}).
		Where("id = ?", id).
		Updates(map[string]any{"status": status, "updated_at": time.Now()}).
		Error; err != nil {
		return nil, err
	}
	return r.Get(ctx, id)
}

func (r *callSessionRepository) Start(ctx context.Context, id string) (*entity.CallSession, error) {
	now := time.Now()
	if err := r.db.WithContext(ctx).
		Model(&model.CallSession{}).
		Where("id = ?", id).
		Updates(map[string]any{"status": "accepted", "started_at": now, "updated_at": now}).
		Error; err != nil {
		return nil, err
	}
	return r.Get(ctx, id)
}

func (r *callSessionRepository) End(ctx context.Context, id string, status string) (*entity.CallSession, error) {
	call, err := r.Get(ctx, id)
	if err != nil || call == nil {
		return call, err
	}
	now := time.Now()
	duration := 0
	if call.StartedAt != nil {
		duration = int(now.Sub(*call.StartedAt).Seconds())
		if duration < 0 {
			duration = 0
		}
	}
	if err := r.db.WithContext(ctx).
		Model(&model.CallSession{}).
		Where("id = ?", id).
		Updates(map[string]any{
			"status":           status,
			"ended_at":         now,
			"duration_seconds": duration,
			"updated_at":       now,
		}).Error; err != nil {
		return nil, err
	}
	return r.Get(ctx, id)
}

func (r *callSessionRepository) ListByConversation(ctx context.Context, conversationID uint, limit int) ([]entity.CallSession, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	var rows []model.CallSession
	if err := r.db.WithContext(ctx).
		Where("conversation_id = ?", conversationID).
		Order("created_at DESC").
		Limit(limit).
		Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]entity.CallSession, 0, len(rows))
	for i := range rows {
		out = append(out, *rows[i].ToEntity())
	}
	return out, nil
}

func (r *callSessionRepository) AddParticipant(ctx context.Context, p *entity.CallParticipant) error {
	m := &model.CallParticipant{
		CallID:   p.CallID,
		UserID:   p.UserID,
		Status:   p.Status,
		JoinedAt: p.JoinedAt,
		LeftAt:   p.LeftAt,
	}
	return r.db.WithContext(ctx).
		Where(model.CallParticipant{CallID: p.CallID, UserID: p.UserID}).
		Assign(model.CallParticipant{Status: p.Status}).
		FirstOrCreate(m).Error
}

func (r *callSessionRepository) GetParticipants(ctx context.Context, callID string) ([]entity.CallParticipant, error) {
	var rows []model.CallParticipant
	if err := r.db.WithContext(ctx).
		Where("call_id = ?", callID).
		Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]entity.CallParticipant, 0, len(rows))
	for i := range rows {
		out = append(out, *rows[i].ToEntity())
	}
	return out, nil
}

func (r *callSessionRepository) UpdateParticipantStatus(ctx context.Context, callID string, userID uint, status string) error {
	updates := map[string]any{"status": status, "updated_at": time.Now()}
	now := time.Now()
	if status == "joined" {
		updates["joined_at"] = now
	} else if status == "left" || status == "declined" || status == "missed" {
		updates["left_at"] = now
	}
	return r.db.WithContext(ctx).
		Model(&model.CallParticipant{}).
		Where("call_id = ? AND user_id = ?", callID, userID).
		Updates(updates).Error
}

func (r *callSessionRepository) CountActiveParticipants(ctx context.Context, callID string) (int, error) {
	var count int64
	if err := r.db.WithContext(ctx).
		Model(&model.CallParticipant{}).
		Where("call_id = ? AND status = 'joined'", callID).
		Count(&count).Error; err != nil {
		return 0, err
	}
	return int(count), nil
}

func (r *callSessionRepository) GetActiveGroupCall(ctx context.Context, conversationID uint) (*entity.CallSession, error) {
	var m model.CallSession
	err := r.db.WithContext(ctx).
		Where("conversation_id = ? AND is_group = 1 AND status IN ('ringing','accepted')", conversationID).
		Order("created_at DESC").
		First(&m).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}
	return m.ToEntity(), nil
}
