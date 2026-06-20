package season

import "time"

type MovieSeason struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	BaseSlug     string    `gorm:"type:varchar(255);not null;uniqueIndex:uq_ms_slug_season" json:"base_slug"`
	SeasonNumber int       `gorm:"not null;uniqueIndex:uq_ms_slug_season" json:"season_number"`
	SeasonSlug   string    `gorm:"type:varchar(255);not null" json:"season_slug"`
	Name         string    `gorm:"type:varchar(500);not null;default:''" json:"name"`
	FetchedAt    time.Time `gorm:"not null" json:"fetched_at"`
}

func (MovieSeason) TableName() string { return "movie_seasons" }

type MovieEpisode struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	BaseSlug     string    `gorm:"type:varchar(255);not null" json:"base_slug"`
	SeasonNumber int       `gorm:"not null" json:"season_number"`
	ServerName   string    `gorm:"type:varchar(255);not null" json:"server_name"`
	EpisodeName  string    `gorm:"type:varchar(255);not null;default:''" json:"episode_name"`
	EpisodeSlug  string    `gorm:"type:varchar(255);not null" json:"episode_slug"`
	Overview     string    `gorm:"type:text" json:"overview"`
	StillPath    string    `gorm:"type:varchar(500);not null;default:''" json:"still_path"`
	Filename     string    `gorm:"type:varchar(500)" json:"filename"`
	LinkEmbed    string    `gorm:"type:text" json:"link_embed"`
	LinkM3u8     string    `gorm:"type:text" json:"link_m3u8"`
	FetchedAt    time.Time `gorm:"not null" json:"fetched_at"`
}

func (MovieEpisode) TableName() string { return "movie_episodes" }
