package playlist

import mediadto "github.com/tumlumtala/musics-service/internal/module/application/dto/media"

type CreatePlaylistRequest struct {
	Name        string `json:"name" binding:"required"`
	Cover       string `json:"cover"`
	Description string `json:"description"`
}

type AddPlaylistTrackRequest struct {
	MediaItem mediadto.MediaItemRequest `json:"media_item" binding:"required"`
	Position  int                       `json:"position"`
}
