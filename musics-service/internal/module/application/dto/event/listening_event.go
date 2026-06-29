package event

import mediadto "github.com/tumlumtala/musics-service/internal/module/application/dto/media"

// EventType values
const (
	EventPlay     = "play"
	EventSkip     = "skip"
	EventComplete = "complete"
	EventLike     = "like"
	EventUnlike   = "unlike"
	EventRepeat   = "repeat"
)

type AddListeningEventRequest struct {
	MediaItem            mediadto.MediaItemRequest `json:"media_item"       binding:"required"`
	EventUUID            string                    `json:"event_uuid"`
	SessionID            string                    `json:"session_id"`
	Context              string                    `json:"context"`
	PreviousSourceID     string                    `json:"previous_source_id"`
	RecommendationReason string                    `json:"recommendation_reason"`
	EventType            string                    `json:"event_type"       binding:"required,oneof=play skip complete like unlike repeat"`
	ListenDuration       uint32                    `json:"listen_duration"`
	TrackDuration        uint32                    `json:"track_duration"`
	PositionMS           uint32                    `json:"position_ms"`
	Genre                string                    `json:"genre"`
	Mood                 string                    `json:"mood"`
	Energy               *float64                  `json:"energy"`
	Tempo                *float64                  `json:"tempo"`
	MusicalKey           string                    `json:"musical_key"`
	IsInstrumental       *bool                     `json:"is_instrumental"`
	VocalGender          string                    `json:"vocal_gender"`
}
