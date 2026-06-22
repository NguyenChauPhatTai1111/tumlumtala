package model

import "time"

type Theme struct {
	ID                  uint      `gorm:"primaryKey"`
	PresetID            string    `gorm:"uniqueIndex;size:100;not null"`
	Name                string    `gorm:"size:255;not null"`
	Background          string    `gorm:"type:text;not null"`
	BackgroundColor     string    `gorm:"type:text;not null;default:'#ffffff'"`
	IncomingBubbleColor string    `gorm:"size:50;not null;default:'#f0f0f0'"`
	OutgoingBubbleColor string    `gorm:"size:50;not null;default:'#0084ff'"`
	IncomingTextColor   string    `gorm:"size:50;not null;default:'#000000'"`
	OutgoingTextColor   string    `gorm:"size:50;not null;default:'#ffffff'"`
	Status              string    `gorm:"type:enum('active','inactive');not null;default:'active'"`
	SortOrder           int       `gorm:"default:0"`
	CreatedAt           time.Time
	UpdatedAt           time.Time
}

func (Theme) TableName() string { return "themes" }
