package history

import (
	"time"

	"github.com/tumlumtala/musics-service/internal/module/domain/entity/media"
)

type RecentTrack struct {
	ID          uint64          `gorm:"primaryKey;autoIncrement" json:"id"`
	UserUUID    string          `gorm:"type:varchar(36);not null;index" json:"user_uuid"`
	MediaItemID uint64          `gorm:"not null;index" json:"media_item_id"`
	MediaItem   media.MediaItem `gorm:"foreignKey:MediaItemID" json:"media_item"`
	PlayedAt    time.Time       `gorm:"not null;index" json:"played_at"`
}

func (RecentTrack) TableName() string {
	return "music_recent_tracks"
}
