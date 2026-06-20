package liked

import "time"

type MovieLiked struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	UserUUID   string    `gorm:"type:varchar(36);not null;uniqueIndex:idx_ml_user_slug" json:"user_uuid"`
	Slug       string    `gorm:"type:varchar(255);not null;uniqueIndex:idx_ml_user_slug" json:"slug"`
	Name       string    `gorm:"type:varchar(500);not null" json:"name"`
	OriginName string    `gorm:"type:varchar(500)" json:"origin_name"`
	Thumbnail  string    `gorm:"type:text" json:"thumbnail"`
	PosterURL  string    `gorm:"type:text;column:poster_url" json:"poster_url"`
	Type       string    `gorm:"type:varchar(50)" json:"type"`
	Year       int       `json:"year"`
	Quality    string    `gorm:"type:varchar(50)" json:"quality"`
	Lang       string    `gorm:"type:varchar(50)" json:"lang"`
	Rating     string    `gorm:"type:varchar(10)" json:"rating"`
	LikedAt    time.Time `gorm:"not null;index" json:"liked_at"`
}

func (MovieLiked) TableName() string { return "movie_liked" }
