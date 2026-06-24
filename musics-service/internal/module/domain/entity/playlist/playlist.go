package playlist

import (
	"time"

	"github.com/tumlumtala/musics-service/internal/module/domain/entity/media"
)

type Playlist struct {
	ID          uint64          `gorm:"primaryKey;autoIncrement" json:"id"`
	UserUUID    string          `gorm:"type:varchar(36);not null;index" json:"user_uuid"`
	Name        string          `gorm:"type:varchar(255);not null" json:"name"`
	Cover       string          `gorm:"type:text" json:"cover"`
	Description string          `gorm:"type:text" json:"description"`
	Tracks      []PlaylistTrack `gorm:"foreignKey:PlaylistID" json:"tracks,omitempty"`
	CreatedAt   time.Time       `json:"created_at"`
	UpdatedAt   time.Time       `json:"updated_at"`
}

func (Playlist) TableName() string {
	return "music_playlists"
}

type PlaylistTrack struct {
	ID          uint64          `gorm:"primaryKey;autoIncrement" json:"id"`
	PlaylistID  uint64          `gorm:"not null;uniqueIndex:idx_music_playlist_track" json:"playlist_id"`
	MediaItemID uint64          `gorm:"not null;uniqueIndex:idx_music_playlist_track" json:"media_item_id"`
	MediaItem   media.MediaItem `gorm:"foreignKey:MediaItemID" json:"media_item"`
	Position    int             `gorm:"not null;default:0" json:"position"`
	CreatedAt   time.Time       `json:"created_at"`
}

func (PlaylistTrack) TableName() string {
	return "music_playlist_tracks"
}
