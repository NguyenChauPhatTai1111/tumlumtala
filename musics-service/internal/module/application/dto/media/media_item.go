package media

type MediaItemRequest struct {
	SourceID       string   `json:"source_id" binding:"required"`
	Type           string   `json:"type" binding:"required,oneof=audio video"`
	Title          string   `json:"title" binding:"required"`
	Artist         string   `json:"artist"`
	Thumbnail      string   `json:"thumbnail"`
	StreamURL      string   `json:"stream_url"`
	VideoID        string   `json:"video_id"`
	Duration       *int     `json:"duration"`
	ViewCount      int64    `json:"view_count"`
	Genre          string   `json:"genre"`
	Mood           string   `json:"mood"`
	Energy         *float64 `json:"energy"`
	Tempo          *float64 `json:"tempo"`
	MusicalKey     string   `json:"musical_key"`
	IsInstrumental *bool    `json:"is_instrumental"`
	VocalGender    string   `json:"vocal_gender"`
	LikeCount      int64    `json:"like_count"`
	RepostCount    int64    `json:"repost_count"`
	Tags           string   `json:"tags"`
}
