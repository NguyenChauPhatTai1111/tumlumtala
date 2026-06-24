package media

type MediaItemRequest struct {
	SourceID  string `json:"source_id" binding:"required"`
	Type      string `json:"type" binding:"required,oneof=audio video"`
	Title     string `json:"title" binding:"required"`
	Artist    string `json:"artist"`
	Thumbnail string `json:"thumbnail"`
	StreamURL string `json:"stream_url"`
	VideoID   string `json:"video_id"`
	Duration  *int   `json:"duration"`
	ViewCount int64  `json:"view_count"`
}
