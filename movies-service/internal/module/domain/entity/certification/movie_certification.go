package certification

import "time"

type MovieCertification struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	Slug       string    `gorm:"type:varchar(255);not null;uniqueIndex" json:"slug"`
	TmdbID     string    `gorm:"type:varchar(50);not null" json:"tmdb_id"`
	TmdbType   string    `gorm:"type:varchar(10);not null;default:movie" json:"tmdb_type"`
	Rating     string    `gorm:"type:varchar(10);not null;default:''" json:"rating"`
	FetchedAt  time.Time `gorm:"not null" json:"fetched_at"`
}

func (MovieCertification) TableName() string { return "movie_certifications" }
