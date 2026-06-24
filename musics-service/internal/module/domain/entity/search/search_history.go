package search

import "time"

type SearchHistory struct {
	ID        uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	UserUUID  string    `gorm:"type:varchar(36);not null;index" json:"user_uuid"`
	Keyword   string    `gorm:"type:varchar(255);not null" json:"keyword"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (SearchHistory) TableName() string {
	return "music_search_history"
}
