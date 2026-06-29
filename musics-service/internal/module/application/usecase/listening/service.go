package listening

import (
	"context"
	"time"

	eventdto "github.com/tumlumtala/musics-service/internal/module/application/dto/event"
	mediauc "github.com/tumlumtala/musics-service/internal/module/application/usecase/media"
	evententity "github.com/tumlumtala/musics-service/internal/module/domain/entity/event"
	musicrepo "github.com/tumlumtala/musics-service/internal/module/domain/repository"
)

type UseCase struct {
	repo musicrepo.MusicRepository
}

func NewUseCase(repo musicrepo.MusicRepository) *UseCase {
	return &UseCase{repo: repo}
}

func (u *UseCase) Track(ctx context.Context, userUUID string, req eventdto.AddListeningEventRequest) (*evententity.ListeningEvent, error) {
	mediaItem := mediauc.FromRequest(userUUID, req.MediaItem)
	saved, err := u.repo.UpsertMediaItem(ctx, mediaItem)
	if err != nil {
		return nil, err
	}

	e := evententity.ListeningEvent{
		UserUUID:       userUUID,
		MediaItemID:    saved.ID,
		SourceID:       saved.SourceID,
		EventType:      req.EventType,
		ListenDuration: req.ListenDuration,
		TrackDuration:  req.TrackDuration,
		Genre:          req.Genre,
		OccurredAt:     time.Now(),
	}

	result, err := u.repo.AddListeningEvent(ctx, e)
	if err != nil {
		return nil, err
	}

	// fire-and-forget DNA update for play/skip/complete events
	if req.Genre != "" && (req.EventType == eventdto.EventPlay || req.EventType == eventdto.EventSkip || req.EventType == eventdto.EventComplete) {
		go u.updateDNA(context.Background(), userUUID, req)
	}

	return result, nil
}

func (u *UseCase) updateDNA(ctx context.Context, userUUID string, req eventdto.AddListeningEventRequest) {
	now := time.Now()
	dna := evententity.UserDNA{
		UserUUID:     userUUID,
		Genre:        req.Genre,
		LastPlayedAt: &now,
	}

	switch req.EventType {
	case eventdto.EventPlay:
		dna.PlayCount = 1
	case eventdto.EventSkip:
		dna.SkipCount = 1
	case eventdto.EventComplete:
		dna.PlayCount = 1
		dna.CompletionSum = 100
	}

	if req.EventType != eventdto.EventSkip && req.TrackDuration > 0 {
		ratio := uint32(float64(req.ListenDuration) / float64(req.TrackDuration) * 100)
		dna.CompletionSum = ratio
	}

	_ = u.repo.UpsertUserDNA(ctx, dna)
}
