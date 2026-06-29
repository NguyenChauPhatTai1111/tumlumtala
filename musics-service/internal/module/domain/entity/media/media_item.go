package media

import "time"

type MediaItem struct {
	ID             uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	UserUUID       string    `gorm:"type:varchar(36);not null;uniqueIndex:idx_music_user_source" json:"user_uuid"`
	SourceID       string    `gorm:"type:varchar(128);not null;uniqueIndex:idx_music_user_source" json:"source_id"`
	Type           string    `gorm:"type:enum('audio','video');not null;uniqueIndex:idx_music_user_source" json:"type"`
	Title          string    `gorm:"type:varchar(255);not null" json:"title"`
	Artist         string    `gorm:"type:varchar(255)" json:"artist"`
	Thumbnail      string    `gorm:"type:text" json:"thumbnail"`
	StreamURL      string    `gorm:"type:text;column:stream_url" json:"stream_url,omitempty"`
	VideoID        string    `gorm:"type:varchar(128)" json:"video_id,omitempty"`
	Duration       *int      `json:"duration,omitempty"`
	ViewCount      int64     `gorm:"not null;default:0" json:"view_count"`
	Genre          string    `gorm:"type:varchar(100)" json:"genre,omitempty"`
	Mood           string    `gorm:"type:varchar(100)" json:"mood,omitempty"`
	Energy         *float64  `json:"energy,omitempty"`
	Tempo          *float64  `json:"tempo,omitempty"`
	MusicalKey     string    `gorm:"type:varchar(20)" json:"musical_key,omitempty"`
	IsInstrumental *bool     `json:"is_instrumental,omitempty"`
	VocalGender    string    `gorm:"type:varchar(24)" json:"vocal_gender,omitempty"`
	LikeCount      int64     `gorm:"not null;default:0" json:"like_count,omitempty"`
	RepostCount    int64     `gorm:"not null;default:0" json:"repost_count,omitempty"`
	Tags           string    `gorm:"type:text" json:"tags,omitempty"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

func (MediaItem) TableName() string {
	return "music_media_items"
}
