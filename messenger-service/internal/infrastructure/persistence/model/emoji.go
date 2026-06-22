package model

import "time"

type EmojiPack struct {
	ID        uint   `gorm:"primaryKey"`
	Code      string `gorm:"uniqueIndex;size:50;not null"`
	Name      string `gorm:"size:150;not null"`
	IsActive  bool   `gorm:"default:true"`
	CreatedAt time.Time
	UpdatedAt time.Time
}

func (EmojiPack) TableName() string { return "emoji_packs" }

type Emoji struct {
	ID            uint    `gorm:"primaryKey"`
	Code          string  `gorm:"uniqueIndex;size:120;not null"`
	Name          string  `gorm:"size:150;not null"`
	PackID        *uint   `gorm:"index"`
	AssetURL      string  `gorm:"type:text;not null"`
	AnimationType *string `gorm:"size:50"`
	Price         int     `gorm:"default:0"`
	Status        int     `gorm:"default:1"`
	SourceType    string  `gorm:"size:20;default:'unicode_icon'"`
	SourceValue   string  `gorm:"size:2048;not null"`
	IconText      *string `gorm:"size:32"`
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

func (Emoji) TableName() string { return "emojis" }
