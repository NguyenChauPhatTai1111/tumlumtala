package watch

import "time"

type WatchHistory struct {
	ID                  uint       `gorm:"primaryKey" json:"id"`
	UserUUID            string     `gorm:"type:varchar(36);not null;index" json:"user_uuid"`
	Slug                string     `gorm:"type:varchar(255);not null" json:"slug"`
	Name                string     `gorm:"type:varchar(500);not null" json:"name"`
	OriginName          string     `gorm:"type:varchar(500)" json:"origin_name"`
	Thumbnail           string     `gorm:"type:text" json:"thumbnail"`
	PosterURL           string     `gorm:"type:text;column:poster_url" json:"poster_url"`
	EpisodeName         string     `gorm:"type:varchar(100)" json:"episode_name"`
	EpisodeSlug         string     `gorm:"type:varchar(255)" json:"episode_slug"`
	Type                string     `gorm:"type:varchar(50)" json:"type"`
	Year                int        `json:"year"`
	Quality             string     `gorm:"type:varchar(50)" json:"quality"`
	Lang                string     `gorm:"type:varchar(50)" json:"lang"`
	Rating              string     `gorm:"type:varchar(10)" json:"rating"`
	WatchedAt           time.Time  `gorm:"not null;index" json:"watched_at"`
	LastWatchedPosition float64    `gorm:"default:0" json:"last_watched_position"`
	Duration            float64    `gorm:"default:0" json:"duration"`
	Completed           bool       `gorm:"default:false" json:"completed"`
	DeletedAt           *time.Time `gorm:"index" json:"deleted_at"`
}

func (WatchHistory) TableName() string { return "movie_watch_history" }
