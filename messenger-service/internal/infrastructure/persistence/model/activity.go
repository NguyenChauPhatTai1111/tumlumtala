package model

import (
	"encoding/json"
	"time"
)

type Activity struct {
	ID             uint            `gorm:"primaryKey"`
	ConversationID uint            `gorm:"index"`
	TargetUserID   *uint           `gorm:"index"`
	ActorUserID    uint            `gorm:"index"`
	MetaData       json.RawMessage `gorm:"column:metadata;type:json"`
	ActionType     string
	Content        string
	CreatedAt      *time.Time
}

func (Activity) TableName() string {
	return "conversation_activities"
}
