package entity

import "time"

type UserMessageHistory struct {
	ID        uint
	MessageID uint
	EditedBy  uint
	Content   string
	EditedAt  *time.Time
}
