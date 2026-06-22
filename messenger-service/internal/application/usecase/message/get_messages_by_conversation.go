package message

import (
	"context"
	"encoding/json"

	activityDTO "github.com/tumlumtala/messenger-service/internal/application/dto/activity"
	historyDTO "github.com/tumlumtala/messenger-service/internal/application/dto/history"
	messageDTO "github.com/tumlumtala/messenger-service/internal/application/dto/message"
	queryservice "github.com/tumlumtala/messenger-service/internal/application/query"
	domainerrors "github.com/tumlumtala/messenger-service/internal/domain/errors"
	"github.com/tumlumtala/messenger-service/internal/shared/utils"
)

type GetMessagesByConversationUseCase struct {
	messageQS      queryservice.UserMessageQueryService
	conversationQS queryservice.UserConversationQueryService
	activityQS     queryservice.UserConversationActivityQueryService
}

type GetMessagesByConversationResult struct {
	Messages      []messageDTO.MessageDTO            `json:"items"`
	Activities    []activityDTO.CreateActivityOutput `json:"activities"`
	PaginatorInfo utils.Pagination                   `json:"paginator_info"`
}

func NewGetMessagesByConversationUseCase(
	messageQS queryservice.UserMessageQueryService,
	conversationQS queryservice.UserConversationQueryService,
	activityQS queryservice.UserConversationActivityQueryService,
) *GetMessagesByConversationUseCase {
	return &GetMessagesByConversationUseCase{messageQS: messageQS, conversationQS: conversationQS, activityQS: activityQS}
}

func (uc *GetMessagesByConversationUseCase) Execute(ctx context.Context, conversationID, userID uint, filter utils.QueryFilter) (*GetMessagesByConversationResult, error) {
	ok, err := uc.conversationQS.IsParticipant(ctx, conversationID, userID)
	if err != nil {
		return nil, err
	}
	if !ok {
		return nil, domainerrors.ErrNotInConversation
	}

	originalOffset := filter.Offset
	filter.Normalize("message")
	if originalOffset > 0 {
		filter.Offset = originalOffset
		filter.Page = (originalOffset/filter.Limit) + 1
	}

	items, total, err := uc.messageQS.GetMessagesByConversationID(ctx, conversationID, userID, filter)
	if err != nil {
		return nil, err
	}

	activities, _, err := uc.activityQS.GetActivitiesByConversationID(ctx, conversationID, utils.QueryFilter{Limit: 100})
	if err != nil {
		return nil, err
	}

	out := make([]messageDTO.MessageDTO, len(items))
	for i, msg := range items {
		reactions := make([]messageDTO.ReactionCountDTO, len(msg.Reactions))
		for j, r := range msg.Reactions {
			reactions[j] = messageDTO.ReactionCountDTO{UserID: r.UserID, Emoji: r.Emoji}
		}
		histories := make([]historyDTO.MessageHistoryDTO, len(msg.Histories))
		for k, h := range msg.Histories {
			histories[k] = historyDTO.MessageHistoryDTO{
				ID:       h.ID,
				Content:  h.Content,
				EditedBy: h.EditedBy,
				EditedAt: *h.EditedAt,
			}
		}
		var fileMeta *messageDTO.FileMetadata
		if msg.Metadata != "" && msg.Metadata != "{}" {
			var raw struct {
				File *messageDTO.FileMetadata `json:"file"`
			}
			if err := json.Unmarshal([]byte(msg.Metadata), &raw); err == nil && raw.File != nil && raw.File.OriginalName != "" {
				fileMeta = raw.File
			}
		}
		out[i] = messageDTO.MessageDTO{
			ID:               msg.ID,
			ConversationID:   msg.ConversationID,
			Seq:              msg.Seq,
			SenderID:         msg.SenderID,
			SenderName:       msg.SenderName,
			SenderGender:     msg.SenderGender,
			Content:          msg.Content,
			MessageType:      msg.MessageType,
			EmojiSourceType:  msg.EmojiSourceType,
			ReplyToMessageID: msg.ReplyToMessageID,
			ReplyToContent:   msg.ReplyToContent,
			ReplyToSenderID:  msg.ReplyToSenderID,
			Reactions:        reactions,
			Histories:        histories,
			IsUpdated:        len(histories) > 0,
			Metadata:         fileMeta,
			CreatedAt:        msg.CreatedAt,
			UpdatedAt:        msg.UpdatedAt,
			TempID:           msg.TempID,
		}
	}

	activityOutputs := make([]activityDTO.CreateActivityOutput, len(activities))
	for i, act := range activities {
		activityOutputs[i] = activityDTO.CreateActivityOutput{
			ID:             act.ID,
			ConversationID: act.ConversationID,
			UserID:         act.ActorUserID,
			ActionType:     act.ActionType,
			MetaData:       act.MetaData,
			Content:        act.Content,
			CreatedAt:      act.CreatedAt,
		}
	}

	pg := utils.NewPagination(int32(filter.Page), int32(filter.Limit), int32(total))
	return &GetMessagesByConversationResult{
		Messages:      out,
		Activities:    activityOutputs,
		PaginatorInfo: *pg,
	}, nil
}
