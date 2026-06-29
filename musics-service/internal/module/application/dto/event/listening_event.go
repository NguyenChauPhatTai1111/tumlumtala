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
	MediaItem      mediadto.MediaItemRequest `json:"media_item"       binding:"required"`
	EventType      string                    `json:"event_type"       binding:"required,oneof=play skip complete like unlike repeat"`
	ListenDuration uint32                    `json:"listen_duration"`
	TrackDuration  uint32                    `json:"track_duration"`
	Genre          string                    `json:"genre"`
}
