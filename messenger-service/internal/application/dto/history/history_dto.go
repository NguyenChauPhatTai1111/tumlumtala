package historyDTO

import "time"

type MessageHistoryDTO struct {
	ID       uint      `json:"id"`
	Content  string    `json:"content"`
	EditedBy uint      `json:"edited_by"`
	EditedAt time.Time `json:"edited_at"`
}
