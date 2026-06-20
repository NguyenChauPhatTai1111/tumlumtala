package search

import "time"

type SearchHistory struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserUUID  string    `gorm:"type:varchar(36);not null;index" json:"user_uuid"`
	Keyword   string    `gorm:"type:varchar(255);not null" json:"keyword"`
	CreatedAt time.Time `gorm:"not null" json:"created_at"`
	UpdatedAt time.Time `gorm:"not null" json:"updated_at"`
}

func (SearchHistory) TableName() string { return "movie_search_history" }
