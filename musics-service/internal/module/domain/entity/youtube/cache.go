package youtube

import "time"

type SearchQuery struct {
	ID                uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	Keyword           string    `gorm:"type:varchar(255);not null" json:"keyword"`
	NormalizedKeyword string    `gorm:"type:varchar(255);not null;uniqueIndex" json:"normalized_keyword"`
	ResultCount       uint32    `gorm:"not null;default:0" json:"result_count"`
	CachedAt          time.Time `gorm:"not null" json:"cached_at"`
	ExpiresAt         time.Time `gorm:"not null;index" json:"expires_at"`
}

func (SearchQuery) TableName() string {
	return "youtube_search_queries"
}

type Track struct {
	ID            uint64     `gorm:"primaryKey;autoIncrement" json:"-"`
	SearchQueryID uint64     `gorm:"not null;index" json:"-"`
	Keyword       string     `gorm:"type:varchar(255);not null" json:"-"`
	VideoID       string     `gorm:"type:varchar(32);not null;index" json:"id"`
	Title         string     `gorm:"type:varchar(500);not null" json:"title"`
	Thumbnail     string     `gorm:"type:text" json:"thumbnail"`
	ChannelTitle  string     `gorm:"type:varchar(255)" json:"channelTitle"`
	Duration      *uint32    `json:"duration,omitempty"`
	ViewCount     uint64     `gorm:"not null;default:0" json:"viewCount,omitempty"`
	PublishedAt   *time.Time `json:"publishedAt,omitempty"`
	Position      uint32     `gorm:"not null;default:0" json:"-"`
	CachedAt      time.Time  `gorm:"not null" json:"-"`
}

func (Track) TableName() string {
	return "youtube_tracks"
}
