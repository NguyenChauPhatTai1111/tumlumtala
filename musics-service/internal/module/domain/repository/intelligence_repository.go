package repository

import (
	"context"
	"time"

	"github.com/tumlumtala/musics-service/internal/module/domain/entity/event"
	"github.com/tumlumtala/musics-service/internal/module/domain/entity/intelligence"
	"github.com/tumlumtala/musics-service/internal/module/domain/entity/media"
)

type IntelligenceRepository interface {
	UpsertDNADimension(ctx context.Context, dimension intelligence.DNADimension) error
	ListDNADimensions(ctx context.Context, userUUID string) ([]intelligence.DNADimension, error)
	ListListeningEventsSince(ctx context.Context, userUUID string, since time.Time, limit int) ([]event.ListeningEvent, error)
	ListCommunityEventsSince(ctx context.Context, excludeUserUUID string, since time.Time, limit int) ([]event.ListeningEvent, error)
	ListCandidateMedia(ctx context.Context, userUUID string, limit int) ([]media.MediaItem, error)
	ListHiddenGemMedia(ctx context.Context, limit int) ([]media.MediaItem, error)
	FindMediaBySourceIDs(ctx context.Context, sourceIDs []string) ([]media.MediaItem, error)

	CreateAISession(ctx context.Context, session intelligence.AISession) error
	UpdateAISession(ctx context.Context, session intelligence.AISession) error
	GetAISession(ctx context.Context, userUUID, sessionID string) (*intelligence.AISession, error)
	AddAIMessage(ctx context.Context, message intelligence.AIMessage) error
	ListAIMessages(ctx context.Context, sessionID string) ([]intelligence.AIMessage, error)
	ReplaceAISessionTracks(ctx context.Context, sessionID string, tracks []intelligence.AISessionTrack) error
	AppendAISessionTracks(ctx context.Context, sessionID string, tracks []intelligence.AISessionTrack) error
	ListAISessionTracks(ctx context.Context, sessionID string) ([]intelligence.AISessionTrack, error)

	UpsertChallengeProgress(ctx context.Context, progress intelligence.ChallengeProgress) error
	CreateSyncRoom(ctx context.Context, room intelligence.SyncRoom) error
	JoinSyncRoom(ctx context.Context, userUUID, inviteCode string) (*intelligence.SyncRoom, error)
	GetSyncRoom(ctx context.Context, userUUID, roomID string) (*intelligence.SyncRoom, error)
}
