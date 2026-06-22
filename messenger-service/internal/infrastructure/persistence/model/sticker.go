package model

import "time"

type StickerPack struct {
	ID           uint    `gorm:"primaryKey"`
	Name         string  `gorm:"uniqueIndex;size:255;not null"`
	Description  *string `gorm:"type:text"`
	ThumbnailURL *string `gorm:"size:500"`
	IsActive     bool    `gorm:"default:true"`
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

func (StickerPack) TableName() string { return "sticker_packs" }

type Sticker struct {
	ID        uint   `gorm:"primaryKey"`
	PackID    uint   `gorm:"index;not null"`
	Name      string `gorm:"size:255;not null"`
	ImageURL  string `gorm:"size:500;not null"`
	SortOrder int    `gorm:"default:0"`
	IsActive  bool   `gorm:"default:true"`
	CreatedAt time.Time
	UpdatedAt time.Time
}

func (Sticker) TableName() string { return "stickers" }
