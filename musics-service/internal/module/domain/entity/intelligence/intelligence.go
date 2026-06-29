package intelligence

import (
	"encoding/json"
	"time"

	"github.com/tumlumtala/musics-service/internal/module/domain/entity/media"
)

type DNADimension struct {
	ID                uint64     `gorm:"primaryKey;autoIncrement" json:"id"`
	UserUUID          string     `gorm:"type:varchar(36);not null" json:"-"`
	DimensionType     string     `gorm:"type:varchar(32);not null" json:"type"`
	DimensionValue    string     `gorm:"type:varchar(128);not null" json:"value"`
	PositiveScore     float64    `gorm:"not null;default:0" json:"positive_score"`
	NegativeScore     float64    `gorm:"not null;default:0" json:"negative_score"`
	PlayCount         uint32     `gorm:"not null;default:0" json:"play_count"`
	CompletionSum     float64    `gorm:"not null;default:0" json:"completion_sum"`
	SkipCount         uint32     `gorm:"not null;default:0" json:"skip_count"`
	LastInteractionAt *time.Time `json:"last_interaction_at,omitempty"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`
}

func (DNADimension) TableName() string { return "music_dna_dimensions" }

type AISession struct {
	ID               string          `gorm:"type:varchar(36);primaryKey" json:"id"`
	UserUUID         string          `gorm:"type:varchar(36);not null" json:"-"`
	Mode             string          `gorm:"type:varchar(24);not null" json:"mode"`
	Prompt           string          `gorm:"type:text;not null" json:"prompt"`
	Title            string          `gorm:"type:varchar(255);not null" json:"title"`
	AssistantMessage string          `gorm:"type:text" json:"assistant_message"`
	Status           string          `gorm:"type:varchar(24);not null" json:"status"`
	Plan             json.RawMessage `gorm:"type:json;not null" json:"plan"`
	Context          json.RawMessage `gorm:"type:json" json:"context,omitempty"`
	CreatedAt        time.Time       `json:"created_at"`
	UpdatedAt        time.Time       `json:"updated_at"`
}

func (AISession) TableName() string { return "music_ai_sessions" }

type AIMessage struct {
	ID        uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	SessionID string    `gorm:"type:varchar(36);not null" json:"session_id"`
	Role      string    `gorm:"type:varchar(16);not null" json:"role"`
	Content   string    `gorm:"type:text;not null" json:"content"`
	CreatedAt time.Time `json:"created_at"`
}

func (AIMessage) TableName() string { return "music_ai_messages" }

type AISessionTrack struct {
	ID              uint64          `gorm:"primaryKey;autoIncrement" json:"id"`
	SessionID       string          `gorm:"type:varchar(36);not null" json:"session_id"`
	MediaItemID     uint64          `gorm:"not null" json:"media_item_id"`
	Position        uint32          `gorm:"not null" json:"position"`
	Phase           string          `gorm:"type:varchar(32);not null" json:"phase"`
	Score           float64         `gorm:"not null" json:"score"`
	EnergyTarget    float64         `gorm:"not null" json:"energy_target"`
	Reason          string          `gorm:"type:varchar(255)" json:"reason"`
	ScheduledMinute uint32          `gorm:"not null" json:"scheduled_minute"`
	MediaItem       media.MediaItem `gorm:"foreignKey:MediaItemID" json:"media_item"`
	CreatedAt       time.Time       `json:"created_at"`
}

func (AISessionTrack) TableName() string { return "music_ai_session_tracks" }

type ChallengeProgress struct {
	ID           uint64     `gorm:"primaryKey;autoIncrement" json:"id"`
	UserUUID     string     `gorm:"type:varchar(36);not null" json:"-"`
	ChallengeKey string     `gorm:"type:varchar(64);not null" json:"key"`
	PeriodKey    string     `gorm:"type:varchar(16);not null" json:"period"`
	Progress     uint32     `gorm:"not null" json:"progress"`
	Target       uint32     `gorm:"not null" json:"target"`
	CompletedAt  *time.Time `json:"completed_at,omitempty"`
	ClaimedAt    *time.Time `json:"claimed_at,omitempty"`
	UpdatedAt    time.Time  `json:"updated_at"`
}

func (ChallengeProgress) TableName() string { return "music_challenge_progress" }

type SyncRoom struct {
	ID         string    `gorm:"type:varchar(36);primaryKey" json:"id"`
	InviteCode string    `gorm:"type:varchar(12);not null;uniqueIndex" json:"invite_code"`
	OwnerUUID  string    `gorm:"type:varchar(36);not null" json:"-"`
	GuestUUID  *string   `gorm:"type:varchar(36)" json:"-"`
	Status     string    `gorm:"type:varchar(16);not null" json:"status"`
	ExpiresAt  time.Time `json:"expires_at"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

func (SyncRoom) TableName() string { return "music_sync_rooms" }
