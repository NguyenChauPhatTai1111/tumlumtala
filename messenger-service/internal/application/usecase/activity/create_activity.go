package activity

import (
	"context"
	"time"

	activityDTO "github.com/tumlumtala/messenger-service/internal/application/dto/activity"
	"github.com/tumlumtala/messenger-service/internal/domain/entity"
	"github.com/tumlumtala/messenger-service/internal/domain/repository"
)

type CreateActivityUseCase struct {
	repo repository.UserConversationActivityRepository
}

func NewCreateActivityUseCase(repo repository.UserConversationActivityRepository) *CreateActivityUseCase {
	return &CreateActivityUseCase{repo: repo}
}

func (uc *CreateActivityUseCase) Execute(ctx context.Context, input *activityDTO.CreateActivityInput) (*activityDTO.CreateActivityOutput, error) {
	if input.ActorUserID == 0 || input.ConversationID == 0 || input.ActionType == "" {
		return nil, nil
	}
	now := time.Now()
	activity := &entity.Activity{
		ConversationID: input.ConversationID,
		ActorUserID:    input.ActorUserID,
		TargetUserID:   input.TargetUserID,
		ActionType:     input.ActionType,
		Content:        input.Content,
		MetaData:       input.MetaData,
		CreatedAt:      &now,
	}
	if err := uc.repo.CreateActivity(ctx, activity); err != nil {
		return nil, err
	}
	return &activityDTO.CreateActivityOutput{
		ID:             activity.ID,
		ConversationID: activity.ConversationID,
		UserID:         activity.ActorUserID,
		ActionType:     activity.ActionType,
		MetaData:       activity.MetaData,
		Content:        activity.Content,
		CreatedAt:      activity.CreatedAt,
	}, nil
}
