package liked

import (
	"time"

	"github.com/tumlumtala/musics-service/internal/module/domain/entity/media"
)

type LikedTrack struct {
	ID          uint64          `gorm:"primaryKey;autoIncrement" json:"id"`
	UserUUID    string          `gorm:"type:varchar(36);not null;uniqueIndex:idx_music_liked_user_media" json:"user_uuid"`
	MediaItemID uint64          `gorm:"not null;uniqueIndex:idx_music_liked_user_media" json:"media_item_id"`
	MediaItem   media.MediaItem `gorm:"foreignKey:MediaItemID" json:"media_item"`
	CreatedAt   time.Time       `json:"created_at"`
}

func (LikedTrack) TableName() string {
	return "music_liked_tracks"
}
