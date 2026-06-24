package media

import (
	"strings"

	mediadto "github.com/tumlumtala/musics-service/internal/module/application/dto/media"
	"github.com/tumlumtala/musics-service/internal/module/domain/entity/media"
)

func FromRequest(userUUID string, req mediadto.MediaItemRequest) media.MediaItem {
	return media.MediaItem{
		UserUUID:  userUUID,
		SourceID:  strings.TrimSpace(req.SourceID),
		Type:      strings.TrimSpace(req.Type),
		Title:     strings.TrimSpace(req.Title),
		Artist:    strings.TrimSpace(req.Artist),
		Thumbnail: strings.TrimSpace(req.Thumbnail),
		StreamURL: strings.TrimSpace(req.StreamURL),
		VideoID:   strings.TrimSpace(req.VideoID),
		Duration:  req.Duration,
		ViewCount: req.ViewCount,
	}
}
