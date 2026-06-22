package repository

import (
	"context"

	"github.com/tumlumtala/messenger-service/internal/domain/entity"
	"github.com/tumlumtala/messenger-service/internal/shared/utils"
)

type UserConversationRepository interface {
	GetConversationByID(ctx context.Context, conversationID uint) (*entity.UserConversation, error)
	GetUserConversations(ctx context.Context, userID uint, filter utils.QueryFilter) ([]entity.UserConversation, int64, error)
	IsParticipant(ctx context.Context, conversationID, userID uint) (bool, error)
	GetConversationIDsForUser(ctx context.Context, userID uint) ([]uint, error)
	GetParticipants(ctx context.Context, conversationID uint) ([]entity.ParticipantInfo, error)
	GetParticipant(ctx context.Context, conversationID, userID uint) (*entity.ParticipantInfo, error)
	FindNextOwner(ctx context.Context, conversationID, excludingUserID uint) (*entity.ParticipantInfo, error)

	CreateConversation(ctx context.Context, conv *entity.UserConversation, participantIDs []uint) error
	UpdateConversation(ctx context.Context, conv *entity.UserConversation) error
	UpdateParticipantRole(ctx context.Context, conversationID, userID uint, role string) error
	AddParticipant(ctx context.Context, participant *entity.UserConversationParticipant) error
	DeleteParticipant(ctx context.Context, conversationID, userID uint) error
	UpdateParticipantNickname(ctx context.Context, conversationID, userID uint, nickname string) error
	UpdateParticipantNotifications(ctx context.Context, conversationID, userID uint, enabled bool) error
	ArchiveConversation(ctx context.Context, conversationID, userID uint) error
	RestoreConversation(ctx context.Context, conversationID, userID uint) error
	DeleteConversation(ctx context.Context, conversationID, userID uint) error
	RestoreDeletedParticipants(ctx context.Context, conversationID uint) error
	UpdateLastMessageAt(ctx context.Context, conversationID, messageID, senderID uint, content string) error
	UpdateLastMessageAtReaction(ctx context.Context, conversationID, messageID, senderID, reactToUserID uint, content string) error
	UpdateLastMessageContent(ctx context.Context, conversationID, messageID uint, content string) error
	MarkRead(ctx context.Context, conversationID, userID uint, lastReadSeq *uint) error
}
