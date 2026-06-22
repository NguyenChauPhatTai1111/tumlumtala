package message

import (
	"context"
	"encoding/json"
	"strings"
	"time"

	messageDTO "github.com/tumlumtala/messenger-service/internal/application/dto/message"
	queryservice "github.com/tumlumtala/messenger-service/internal/application/query"
	"github.com/tumlumtala/messenger-service/internal/domain/entity"
	domainerrors "github.com/tumlumtala/messenger-service/internal/domain/errors"
	"github.com/tumlumtala/messenger-service/internal/domain/repository"
)

type SendMessageUseCase struct {
	messageRepo      repository.UserMessageRepository
	messageQS        queryservice.UserMessageQueryService
	conversationQS   queryservice.UserConversationQueryService
	conversationRepo repository.UserConversationRepository
}

func NewSendMessageUseCase(
	messageRepo repository.UserMessageRepository,
	conversationQS queryservice.UserConversationQueryService,
	messageQS queryservice.UserMessageQueryService,
	conversationRepo repository.UserConversationRepository,
) *SendMessageUseCase {
	return &SendMessageUseCase{messageRepo: messageRepo, conversationQS: conversationQS, messageQS: messageQS, conversationRepo: conversationRepo}
}

func (uc *SendMessageUseCase) Execute(ctx context.Context, input messageDTO.SendMessageInput) (*messageDTO.SendMessageOutput, error) {
	if input.ConversationID == 0 {
		return nil, domainerrors.ErrInvalidConversationID
	}
	if strings.TrimSpace(input.Content) == "" && input.MessageType == "text" {
		return nil, domainerrors.ErrEmptyMessageContent
	}

	ok, err := uc.conversationQS.IsParticipant(ctx, input.ConversationID, input.SenderID)
	if err != nil {
		return nil, err
	}
	if !ok {
		return nil, domainerrors.ErrNotInConversation
	}

	msgType := strings.TrimSpace(input.MessageType)
	if msgType == "" {
		msgType = "text"
	}

	if input.ReplyToMessageID != nil {
		replyMsg, err := uc.messageQS.GetMessageByID(ctx, *input.ReplyToMessageID)
		if err != nil {
			return nil, domainerrors.ErrSendMessage
		}
		if replyMsg == nil || replyMsg.ConversationID != input.ConversationID {
			return nil, domainerrors.ErrInvalidMessageID
		}
	}

	metadataJSON := "{}"
	if input.FileMetadata != nil && input.FileMetadata.OriginalName != "" {
		type metadataPayload struct {
			File struct {
				OriginalName string `json:"original_name,omitempty"`
				Size         int64  `json:"size,omitempty"`
				MimeType     string `json:"mime_type,omitempty"`
				Duration     int64  `json:"duration,omitempty"`
			} `json:"file"`
		}
		var mp metadataPayload
		mp.File.OriginalName = input.FileMetadata.OriginalName
		mp.File.Size = input.FileMetadata.Size
		mp.File.MimeType = input.FileMetadata.MimeType
		mp.File.Duration = input.FileMetadata.Duration
		if b, err := json.Marshal(mp); err == nil {
			metadataJSON = string(b)
		}
	}

	msg := &entity.UserMessage{
		ConversationID:   input.ConversationID,
		SenderID:         input.SenderID,
		Content:          strings.TrimSpace(input.Content),
		TempID:           input.TempID,
		MessageType:      msgType,
		EmojiSourceType:  strings.TrimSpace(input.EmojiSourceType),
		ReplyToMessageID: input.ReplyToMessageID,
		Metadata:         metadataJSON,
	}
	if err := uc.messageRepo.CreateMessage(ctx, msg); err != nil {
		return nil, domainerrors.ErrSendMessage
	}
	if err := uc.conversationRepo.RestoreDeletedParticipants(ctx, input.ConversationID); err != nil {
		return nil, domainerrors.ErrSendMessage
	}
	if err := uc.conversationRepo.UpdateLastMessageAt(ctx, input.ConversationID, msg.ID, input.SenderID, msg.Content); err != nil {
		return nil, domainerrors.ErrSendMessage
	}

	out := &messageDTO.SendMessageOutput{
		ID:               msg.ID,
		ConversationID:   msg.ConversationID,
		Seq:              msg.ID,
		SenderID:         msg.SenderID,
		SenderName:       msg.SenderName,
		Content:          msg.Content,
		MessageType:      msg.MessageType,
		TempID:           msg.TempID,
		ReplyToMessageID: msg.ReplyToMessageID,
		CreatedAt:        msg.CreatedAt.Format(time.RFC3339),
		UpdatedAt:        msg.UpdatedAt.Format(time.RFC3339),
	}
	if input.FileMetadata != nil && input.FileMetadata.OriginalName != "" {
		out.Metadata = input.FileMetadata
	}
	return out, nil
}
