package listening

import (
	"context"
	"strings"
	"time"

	eventdto "github.com/tumlumtala/musics-service/internal/module/application/dto/event"
	mediauc "github.com/tumlumtala/musics-service/internal/module/application/usecase/media"
	evententity "github.com/tumlumtala/musics-service/internal/module/domain/entity/event"
	intelligenceentity "github.com/tumlumtala/musics-service/internal/module/domain/entity/intelligence"
	musicrepo "github.com/tumlumtala/musics-service/internal/module/domain/repository"
)

type Repository interface {
	musicrepo.MusicRepository
	musicrepo.IntelligenceRepository
}

type UseCase struct {
	repo Repository
}

func NewUseCase(repo Repository) *UseCase {
	return &UseCase{repo: repo}
}

func (u *UseCase) Track(ctx context.Context, userUUID string, req eventdto.AddListeningEventRequest) (*evententity.ListeningEvent, error) {
	mediaItem := mediauc.FromRequest(userUUID, req.MediaItem)
	saved, err := u.repo.UpsertMediaItem(ctx, mediaItem)
	if err != nil {
		return nil, err
	}

	now := time.Now()
	contextName := strings.TrimSpace(req.Context)
	if contextName == "" {
		contextName = "organic"
	}
	var eventUUID *string
	if value := strings.TrimSpace(req.EventUUID); value != "" {
		eventUUID = &value
	}
	completionRatio := 0.0
	if req.TrackDuration > 0 {
		completionRatio = float64(req.ListenDuration) / float64(req.TrackDuration)
		if completionRatio > 1 {
			completionRatio = 1
		}
	}
	e := evententity.ListeningEvent{
		EventUUID:            eventUUID,
		UserUUID:             userUUID,
		SessionID:            strings.TrimSpace(req.SessionID),
		Context:              contextName,
		MediaItemID:          saved.ID,
		SourceID:             saved.SourceID,
		PreviousSourceID:     strings.TrimSpace(req.PreviousSourceID),
		RecommendationReason: strings.TrimSpace(req.RecommendationReason),
		EventType:            req.EventType,
		ListenDuration:       req.ListenDuration,
		TrackDuration:        req.TrackDuration,
		PositionMS:           req.PositionMS,
		CompletionRatio:      completionRatio,
		Genre:                req.Genre,
		Mood:                 req.Mood,
		Energy:               req.Energy,
		Tempo:                req.Tempo,
		MusicalKey:           req.MusicalKey,
		IsInstrumental:       req.IsInstrumental,
		VocalGender:          req.VocalGender,
		ListeningHour:        uint8(now.Hour()),
		DayOfWeek:            uint8(now.Weekday()),
		OccurredAt:           now,
	}

	result, err := u.repo.AddListeningEvent(ctx, e)
	if err != nil {
		return nil, err
	}
	if result.Duplicate {
		return result, nil
	}

	if req.EventType == eventdto.EventPlay || req.EventType == eventdto.EventSkip ||
		req.EventType == eventdto.EventComplete || req.EventType == eventdto.EventLike ||
		req.EventType == eventdto.EventUnlike || req.EventType == eventdto.EventRepeat {
		go u.updateDNA(context.Background(), userUUID, req, saved.Artist, now)
	}

	return result, nil
}

func (u *UseCase) updateDNA(ctx context.Context, userUUID string, req eventdto.AddListeningEventRequest, artist string, now time.Time) {
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

	if strings.TrimSpace(req.Genre) != "" {
		_ = u.repo.UpsertUserDNA(ctx, dna)
	}

	positive, negative, plays, skips := dimensionWeights(req.EventType, req.ListenDuration, req.TrackDuration)
	completionValue := 0.0
	if req.TrackDuration > 0 {
		completionValue = min(float64(req.ListenDuration)/float64(req.TrackDuration), 1) * 100
	}
	values := map[string]string{
		"genre":        req.Genre,
		"artist":       artist,
		"mood":         req.Mood,
		"musical_key":  req.MusicalKey,
		"vocal_gender": req.VocalGender,
		"time_bucket":  timeBucket(now.Hour()),
		"weekday":      now.Weekday().String(),
	}
	if req.Energy != nil {
		values["energy"] = energyBucket(*req.Energy)
	}
	if req.Tempo != nil {
		values["tempo"] = tempoBucket(*req.Tempo)
	}
	if req.IsInstrumental != nil {
		values["vocal_style"] = map[bool]string{true: "instrumental", false: "vocal"}[*req.IsInstrumental]
	}
	for dimensionType, value := range values {
		value = strings.TrimSpace(value)
		if value == "" {
			continue
		}
		_ = u.repo.UpsertDNADimension(ctx, intelligenceentity.DNADimension{
			UserUUID:          userUUID,
			DimensionType:     dimensionType,
			DimensionValue:    value,
			PositiveScore:     positive,
			NegativeScore:     negative,
			PlayCount:         plays,
			CompletionSum:     completionValue,
			SkipCount:         skips,
			LastInteractionAt: &now,
		})
	}
}

func dimensionWeights(eventType string, listened, duration uint32) (positive, negative float64, plays, skips uint32) {
	ratio := 0.0
	if duration > 0 {
		ratio = min(float64(listened)/float64(duration), 1)
	}
	switch eventType {
	case eventdto.EventLike:
		return 3, 0, 0, 0
	case eventdto.EventUnlike:
		return 0, 3, 0, 0
	case eventdto.EventRepeat:
		return 2.5, 0, 1, 0
	case eventdto.EventSkip:
		return 0, 1.5 + (1 - ratio), 0, 1
	case eventdto.EventComplete:
		return 1.5 + ratio, 0, 1, 0
	default:
		return 0.5, 0, 1, 0
	}
}

func timeBucket(hour int) string {
	switch {
	case hour < 6:
		return "late_night"
	case hour < 10:
		return "morning"
	case hour < 13:
		return "noon"
	case hour < 18:
		return "afternoon"
	case hour < 22:
		return "evening"
	default:
		return "night"
	}
}

func energyBucket(value float64) string {
	switch {
	case value < 0.35:
		return "low"
	case value < 0.7:
		return "medium"
	default:
		return "high"
	}
}

func tempoBucket(value float64) string {
	switch {
	case value < 85:
		return "slow"
	case value < 125:
		return "mid"
	default:
		return "fast"
	}
}
