package library

import "time"

type Item struct {
	ID        uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	UserUUID  string    `gorm:"type:varchar(36);not null;uniqueIndex:idx_music_library_user_item" json:"user_uuid"`
	ItemType  string    `gorm:"type:enum('playlist','artist','album','radio');not null;uniqueIndex:idx_music_library_user_item" json:"item_type"`
	SourceID  string    `gorm:"type:varchar(128);not null;uniqueIndex:idx_music_library_user_item" json:"source_id"`
	Title     string    `gorm:"type:varchar(255);not null" json:"title"`
	Subtitle  string    `gorm:"type:varchar(255)" json:"subtitle"`
	Thumbnail string    `gorm:"type:text" json:"thumbnail"`
	Metadata  string    `gorm:"type:json" json:"metadata"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (Item) TableName() string {
	return "music_library_items"
}
