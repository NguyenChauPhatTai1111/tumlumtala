package library

import "encoding/json"

type AddItemRequest struct {
	ItemType  string          `json:"item_type" binding:"required,oneof=playlist artist album radio"`
	SourceID  string          `json:"source_id" binding:"required"`
	Title     string          `json:"title" binding:"required"`
	Subtitle  string          `json:"subtitle"`
	Thumbnail string          `json:"thumbnail"`
	Metadata  json.RawMessage `json:"metadata"`
}
