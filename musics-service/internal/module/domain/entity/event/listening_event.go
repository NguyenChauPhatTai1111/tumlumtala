package event

import "time"

type ListeningEvent struct {
	ID              uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	UserUUID        string    `gorm:"type:varchar(36);not null" json:"user_uuid"`
	MediaItemID     uint64    `gorm:"not null" json:"media_item_id"`
	SourceID        string    `gorm:"type:varchar(128);not null" json:"source_id"`
	EventType       string    `gorm:"type:enum('play','skip','complete','like','unlike','repeat');not null" json:"event_type"`
	ListenDuration  uint32    `gorm:"not null;default:0" json:"listen_duration"`
	TrackDuration   uint32    `gorm:"not null;default:0" json:"track_duration"`
	Genre           string    `gorm:"type:varchar(100)" json:"genre,omitempty"`
	OccurredAt      time.Time `gorm:"not null;default:CURRENT_TIMESTAMP" json:"occurred_at"`
}

func (ListeningEvent) TableName() string { return "music_listening_events" }

type UserDNA struct {
	ID            uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	UserUUID      string    `gorm:"type:varchar(36);not null;uniqueIndex:idx_dna_user_genre" json:"user_uuid"`
	Genre         string    `gorm:"type:varchar(100);not null;uniqueIndex:idx_dna_user_genre" json:"genre"`
	PlayCount     uint32    `gorm:"not null;default:0" json:"play_count"`
	CompletionSum uint32    `gorm:"not null;default:0" json:"completion_sum"`
	SkipCount     uint32    `gorm:"not null;default:0" json:"skip_count"`
	LastPlayedAt  *time.Time `json:"last_played_at,omitempty"`
	UpdatedAt     time.Time `json:"updated_at"`
}

func (UserDNA) TableName() string { return "music_user_dna" }
