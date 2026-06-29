package event

import "time"

type ListeningEvent struct {
	ID                   uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	EventUUID            *string   `gorm:"type:varchar(36);uniqueIndex" json:"event_uuid,omitempty"`
	UserUUID             string    `gorm:"type:varchar(36);not null" json:"user_uuid"`
	SessionID            string    `gorm:"type:varchar(36)" json:"session_id,omitempty"`
	Context              string    `gorm:"type:varchar(32);not null;default:organic" json:"context"`
	MediaItemID          uint64    `gorm:"not null" json:"media_item_id"`
	SourceID             string    `gorm:"type:varchar(128);not null" json:"source_id"`
	PreviousSourceID     string    `gorm:"type:varchar(128)" json:"previous_source_id,omitempty"`
	RecommendationReason string    `gorm:"type:varchar(255)" json:"recommendation_reason,omitempty"`
	EventType            string    `gorm:"type:enum('play','skip','complete','like','unlike','repeat');not null" json:"event_type"`
	ListenDuration       uint32    `gorm:"not null;default:0" json:"listen_duration"`
	TrackDuration        uint32    `gorm:"not null;default:0" json:"track_duration"`
	PositionMS           uint32    `gorm:"not null;default:0" json:"position_ms"`
	CompletionRatio      float64   `gorm:"not null;default:0" json:"completion_ratio"`
	Genre                string    `gorm:"type:varchar(100)" json:"genre,omitempty"`
	Mood                 string    `gorm:"type:varchar(100)" json:"mood,omitempty"`
	Energy               *float64  `json:"energy,omitempty"`
	Tempo                *float64  `json:"tempo,omitempty"`
	MusicalKey           string    `gorm:"type:varchar(20)" json:"musical_key,omitempty"`
	IsInstrumental       *bool     `json:"is_instrumental,omitempty"`
	VocalGender          string    `gorm:"type:varchar(24)" json:"vocal_gender,omitempty"`
	ListeningHour        uint8     `gorm:"not null;default:0" json:"listening_hour"`
	DayOfWeek            uint8     `gorm:"not null;default:0" json:"day_of_week"`
	OccurredAt           time.Time `gorm:"not null;default:CURRENT_TIMESTAMP" json:"occurred_at"`
	Duplicate            bool      `gorm:"-" json:"-"`
}

func (ListeningEvent) TableName() string { return "music_listening_events" }

type UserDNA struct {
	ID            uint64     `gorm:"primaryKey;autoIncrement" json:"id"`
	UserUUID      string     `gorm:"type:varchar(36);not null;uniqueIndex:idx_dna_user_genre" json:"user_uuid"`
	Genre         string     `gorm:"type:varchar(100);not null;uniqueIndex:idx_dna_user_genre" json:"genre"`
	PlayCount     uint32     `gorm:"not null;default:0" json:"play_count"`
	CompletionSum uint32     `gorm:"not null;default:0" json:"completion_sum"`
	SkipCount     uint32     `gorm:"not null;default:0" json:"skip_count"`
	LastPlayedAt  *time.Time `json:"last_played_at,omitempty"`
	UpdatedAt     time.Time  `json:"updated_at"`
}

func (UserDNA) TableName() string { return "music_user_dna" }
