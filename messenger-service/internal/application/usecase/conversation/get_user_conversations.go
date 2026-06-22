package conversation

import (
	"context"

	conversationDTO "github.com/tumlumtala/messenger-service/internal/application/dto/conversation"
	queryservice "github.com/tumlumtala/messenger-service/internal/application/query"
	"github.com/tumlumtala/messenger-service/internal/shared/utils"
)

type GetUserConversationsUseCase struct {
	queryService queryservice.UserConversationQueryService
}

func NewGetUserConversationsUseCase(queryService queryservice.UserConversationQueryService) *GetUserConversationsUseCase {
	return &GetUserConversationsUseCase{queryService: queryService}
}

func (uc *GetUserConversationsUseCase) Execute(ctx context.Context, userID uint, filter utils.QueryFilter) (*utils.Paginator[conversationDTO.ConversationDTO], error) {
	filter.Normalize("conversation")
	items, total, err := uc.queryService.GetUserConversations(ctx, userID, filter)
	if err != nil {
		return nil, err
	}

	out := make([]conversationDTO.ConversationDTO, len(items))
	for i, c := range items {
		dto := conversationDTO.ConversationDTO{
			ID:                    c.ID,
			IsGroup:               c.IsGroup,
			IsArchived:            c.IsArchived,
			CreatedAt:             c.CreatedAt,
			CreatedBy:             c.CreatedBy,
			Name:                  c.Name,
			Avatar:                c.Avatar,
			ThemeID:               c.ThemeID,
			ThemeURL:              c.ThemeURL,
			NotificationsEnabled:  c.NotificationsEnabled,
			LastMessageAt:         c.LastMessageAt,
			LastMessageID:         c.LastMessageID,
			LastMessageContent:    c.LastMessageContent,
			LastMessageSenderID:   c.LastMessageSenderID,
			LastMessageSenderName: c.LastMessageSenderName,
			LastMessageType:       c.LastMessageType,
			EmojiSourceType:       c.EmojiSourceType,
			QuickReaction:         c.QuickReaction,
			UnreadCount:           c.UnreadCount,
			LastReadMessageID:     c.LastReadMessageID,
			Participants:          c.Participants,
		}
		if c.Theme != nil {
			dto.Theme = &conversationDTO.ConversationThemeDTO{
				ID:                  c.Theme.ID,
				PresetID:            c.Theme.PresetID,
				Name:                c.Theme.Name,
				Background:          c.Theme.Background,
				BackgroundColor:     c.Theme.BackgroundColor,
				IncomingBubbleColor: c.Theme.IncomingBubbleColor,
				OutgoingBubbleColor: c.Theme.OutgoingBubbleColor,
				IncomingTextColor:   c.Theme.IncomingTextColor,
				OutgoingTextColor:   c.Theme.OutgoingTextColor,
			}
		}
		out[i] = dto
	}

	pagination := utils.NewPagination(int32(filter.Page), int32(filter.Limit), int32(total))
	return &utils.Paginator[conversationDTO.ConversationDTO]{
		Data:          out,
		PaginatorInfo: *pagination,
	}, nil
}
