package repository

import (
	"context"
	"encoding/json"

	"gorm.io/gorm"

	"github.com/tumlumtala/messenger-service/internal/domain/entity"
	"github.com/tumlumtala/messenger-service/internal/infrastructure/persistence/model"
	"github.com/tumlumtala/messenger-service/internal/shared/utils"
)

type UserConversationActivityRepository struct {
	db *gorm.DB
}

func NewUserConversationActivityRepository(db *gorm.DB) *UserConversationActivityRepository {
	return &UserConversationActivityRepository{db: db}
}

func (r *UserConversationActivityRepository) GetActivitiesByConversationID(ctx context.Context, conversationID uint, filter utils.QueryFilter) ([]entity.Activity, int64, error) {
	var activities []model.Activity
	var total int64

	query := r.db.WithContext(ctx).Model(&model.Activity{}).Where("conversation_id = ?", conversationID)

	if filter.Limit > 0 {
		query = query.Limit(filter.Limit)
	}
	if filter.Offset > 0 {
		query = query.Offset(filter.Offset)
	}

	if err := query.Order("created_at DESC").Find(&activities).Error; err != nil {
		return nil, 0, err
	}

	if err := r.db.WithContext(ctx).Model(&model.Activity{}).Where("conversation_id = ?", conversationID).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	result := make([]entity.Activity, len(activities))
	for i, activity := range activities {
		result[i] = entity.Activity{
			ID:             activity.ID,
			ConversationID: activity.ConversationID,
			ActorUserID:    activity.ActorUserID,
			TargetUserID:   activity.TargetUserID,
			ActionType:     activity.ActionType,
			Content:        activity.Content,
			MetaData:       string(activity.MetaData),
			CreatedAt:      activity.CreatedAt,
		}
	}

	return result, total, nil
}

func (r *UserConversationActivityRepository) CreateActivity(ctx context.Context, activity *entity.Activity) error {
	var metadata json.RawMessage
	if activity.MetaData != "" {
		raw := []byte(activity.MetaData)
		if json.Valid(raw) {
			metadata = json.RawMessage(raw)
		} else {
			marshaled, err := json.Marshal(activity.MetaData)
			if err != nil {
				return err
			}
			metadata = json.RawMessage(marshaled)
		}
	}

	m := model.Activity{
		ConversationID: activity.ConversationID,
		ActorUserID:    activity.ActorUserID,
		TargetUserID:   activity.TargetUserID,
		ActionType:     activity.ActionType,
		Content:        activity.Content,
		MetaData:       metadata,
		CreatedAt:      activity.CreatedAt,
	}
	if err := r.db.WithContext(ctx).Create(&m).Error; err != nil {
		return err
	}
	activity.ID = m.ID

	// Cập nhật last_message_at trên conversation để thời gian hiển thị đúng
	if err := r.db.WithContext(ctx).
		Table("conversations").
		Where("id = ?", activity.ConversationID).
		Update("last_message_at", activity.CreatedAt).Error; err != nil {
		return err
	}

	// Increment unread_count cho tất cả participants trừ actor
	return r.db.WithContext(ctx).
		Table("conversation_participants").
		Where("conversation_id = ? AND user_id != ? AND deleted_at IS NULL", activity.ConversationID, activity.ActorUserID).
		Update("unread_count", gorm.Expr("unread_count + 1")).Error
}
