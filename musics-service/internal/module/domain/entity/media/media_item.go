package media

import "time"

type MediaItem struct {
	ID        uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	UserUUID  string    `gorm:"type:varchar(36);not null;uniqueIndex:idx_music_user_source" json:"user_uuid"`
	SourceID  string    `gorm:"type:varchar(128);not null;uniqueIndex:idx_music_user_source" json:"source_id"`
	Type      string    `gorm:"type:enum('audio','video');not null;uniqueIndex:idx_music_user_source" json:"type"`
	Title     string    `gorm:"type:varchar(255);not null" json:"title"`
	Artist    string    `gorm:"type:varchar(255)" json:"artist"`
	Thumbnail string    `gorm:"type:text" json:"thumbnail"`
	StreamURL string    `gorm:"type:text;column:stream_url" json:"stream_url,omitempty"`
	VideoID   string    `gorm:"type:varchar(128)" json:"video_id,omitempty"`
	Duration  *int      `json:"duration,omitempty"`
	ViewCount int64     `gorm:"not null;default:0" json:"view_count"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (MediaItem) TableName() string {
	return "music_media_items"
}
