package conversation

import (
	"context"
	"strings"

	conversationDTO "github.com/tumlumtala/messenger-service/internal/application/dto/conversation"
	queryservice "github.com/tumlumtala/messenger-service/internal/application/query"
	"github.com/tumlumtala/messenger-service/internal/domain/entity"
	domainerrors "github.com/tumlumtala/messenger-service/internal/domain/errors"
	"github.com/tumlumtala/messenger-service/internal/domain/repository"
)

type CreateConversationUseCase struct {
	repo         repository.UserConversationRepository
	activityRepo repository.UserConversationActivityRepository
	userQS       queryservice.UserQueryService
}

func NewCreateConversationUseCase(
	repo repository.UserConversationRepository,
	activityRepo repository.UserConversationActivityRepository,
	userQS queryservice.UserQueryService,
) *CreateConversationUseCase {
	return &CreateConversationUseCase{repo: repo, activityRepo: activityRepo, userQS: userQS}
}

func (uc *CreateConversationUseCase) Execute(ctx context.Context, input conversationDTO.CreateConversationInput) (*conversationDTO.CreateConversationOutput, error) {
	if input.UserID == 0 {
		return nil, domainerrors.ErrInvalidUserID
	}

	participantIDs := appendIfMissing(input.ParticipantIDs, input.UserID)

	if !input.IsGroup && len(participantIDs) < 2 {
		return nil, domainerrors.ErrInvalidParticipantIDs
	}

	name := strings.TrimSpace(input.Name)
	if input.IsGroup && name == "" {
		name = uc.buildGroupName(ctx, input.UserID, participantIDs)
	}

	conv := &entity.UserConversation{
		IsGroup:   input.IsGroup,
		Name:      name,
		CreatedBy: input.UserID,
	}

	if err := uc.repo.CreateConversation(ctx, conv, participantIDs); err != nil {
		return nil, err
	}

	if input.IsGroup {
		actor, err := uc.userQS.GetUserByID(ctx, input.UserID)
		if err == nil && actor != nil {
			activity := &entity.Activity{
				ConversationID: conv.ID,
				ActorUserID:    input.UserID,
				ActionType:     "conversation_created",
				Content:        actor.FullName + " đã tạo cuộc trò chuyện",
			}
			_ = uc.activityRepo.CreateActivity(ctx, activity)
		}
	}

	return &conversationDTO.CreateConversationOutput{
		ID:             conv.ID,
		IsGroup:        conv.IsGroup,
		Name:           conv.Name,
		CreatedBy:      conv.CreatedBy,
		ParticipantIDs: participantIDs,
	}, nil
}

func appendIfMissing(ids []uint, id uint) []uint {
	for _, v := range ids {
		if v == id {
			return ids
		}
	}
	return append(ids, id)
}

func (uc *CreateConversationUseCase) buildGroupName(ctx context.Context, creatorID uint, participantIDs []uint) string {
	seen := map[uint]struct{}{creatorID: {}}
	ordered := []uint{creatorID}
	for _, id := range participantIDs {
		if _, ok := seen[id]; !ok {
			seen[id] = struct{}{}
			ordered = append(ordered, id)
		}
	}
	limit := 3
	if len(ordered) < limit {
		limit = len(ordered)
	}
	var names []string
	for _, uid := range ordered[:limit] {
		u, err := uc.userQS.GetUserByID(ctx, uid)
		if err == nil && u != nil && u.FullName != "" {
			names = append(names, u.FullName)
		}
	}
	return "Nhóm " + strings.Join(names, ", ")
}
