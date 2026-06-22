package seeders

import (
	"fmt"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"github.com/tumlumtala/messenger-service/internal/infrastructure/persistence/model"
)

type EmojiSeeder struct{}

func (s *EmojiSeeder) Name() string { return "EmojiSeeder" }

func (s *EmojiSeeder) Run(db *gorm.DB) error {
	now := time.Now()

	packs := []model.EmojiPack{
		{Code: "face", Name: "Khuôn mặt", IsActive: true, CreatedAt: now, UpdatedAt: now},
		{Code: "animal", Name: "Động vật", IsActive: true, CreatedAt: now, UpdatedAt: now},
		{Code: "people", Name: "Con người", IsActive: true, CreatedAt: now, UpdatedAt: now},
		{Code: "food", Name: "Đồ ăn", IsActive: true, CreatedAt: now, UpdatedAt: now},
		{Code: "nature", Name: "Thiên nhiên", IsActive: true, CreatedAt: now, UpdatedAt: now},
		{Code: "travel", Name: "Du lịch", IsActive: true, CreatedAt: now, UpdatedAt: now},
		{Code: "activity", Name: "Hoạt động", IsActive: true, CreatedAt: now, UpdatedAt: now},
		{Code: "object", Name: "Đồ vật", IsActive: true, CreatedAt: now, UpdatedAt: now},
		{Code: "symbol", Name: "Ký hiệu", IsActive: true, CreatedAt: now, UpdatedAt: now},
		{Code: "flag", Name: "Quốc gia", IsActive: true, CreatedAt: now, UpdatedAt: now},
	}

	for i := range packs {
		if err := db.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "code"}},
			DoUpdates: clause.AssignmentColumns([]string{"name", "is_active", "updated_at"}),
		}).Create(&packs[i]).Error; err != nil {
			return fmt.Errorf("emoji pack %q: %w", packs[i].Code, err)
		}
	}

	// Seed một số emoji unicode cơ bản theo từng pack
	type emojiDef struct {
		code     string
		name     string
		icon     string
		packCode string
	}

	defs := []emojiDef{
		// face
		{"grinning", "Grinning", "😀", "face"},
		{"smile", "Smile", "😊", "face"},
		{"heart_eyes", "Heart Eyes", "😍", "face"},
		{"joy", "Joy", "😂", "face"},
		{"wink", "Wink", "😉", "face"},
		{"cry", "Crying", "😢", "face"},
		{"angry", "Angry", "😠", "face"},
		{"thinking", "Thinking", "🤔", "face"},
		// animal
		{"cat", "Cat", "🐱", "animal"},
		{"dog", "Dog", "🐶", "animal"},
		{"bear", "Bear", "🐻", "animal"},
		{"panda", "Panda", "🐼", "animal"},
		{"fox", "Fox", "🦊", "animal"},
		{"unicorn", "Unicorn", "🦄", "animal"},
		// people
		{"wave", "Wave", "👋", "people"},
		{"thumbsup", "Thumbs Up", "👍", "people"},
		{"thumbsdown", "Thumbs Down", "👎", "people"},
		{"clap", "Clap", "👏", "people"},
		{"pray", "Pray", "🙏", "people"},
		// food
		{"pizza", "Pizza", "🍕", "food"},
		{"hamburger", "Hamburger", "🍔", "food"},
		{"sushi", "Sushi", "🍣", "food"},
		{"cake", "Cake", "🎂", "food"},
		{"coffee", "Coffee", "☕", "food"},
		// nature
		{"sun", "Sun", "☀️", "nature"},
		{"moon", "Moon", "🌙", "nature"},
		{"fire", "Fire", "🔥", "nature"},
		{"snowflake", "Snowflake", "❄️", "nature"},
		{"rainbow", "Rainbow", "🌈", "nature"},
		// symbol
		{"heart", "Heart", "❤️", "symbol"},
		{"star", "Star", "⭐", "symbol"},
		{"check", "Check", "✅", "symbol"},
		{"x", "X Mark", "❌", "symbol"},
		{"tada", "Tada", "🎉", "symbol"},
	}

	// Build pack code→id map
	var allPacks []model.EmojiPack
	if err := db.Find(&allPacks).Error; err != nil {
		return fmt.Errorf("fetch emoji packs: %w", err)
	}
	packIDByCode := make(map[string]uint, len(allPacks))
	for _, p := range allPacks {
		packIDByCode[p.Code] = p.ID
	}

	for _, d := range defs {
		pid := packIDByCode[d.packCode]
		e := model.Emoji{
			Code:        d.code,
			Name:        d.name,
			PackID:      &pid,
			AssetURL:    d.icon,
			SourceType:  "unicode_icon",
			SourceValue: d.icon,
			IconText:    &d.icon,
			Status:      1,
			CreatedAt:   now,
			UpdatedAt:   now,
		}
		if err := db.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "code"}},
			DoUpdates: clause.AssignmentColumns([]string{"name", "pack_id", "updated_at"}),
		}).Create(&e).Error; err != nil {
			return fmt.Errorf("emoji %q: %w", d.code, err)
		}
	}

	fmt.Printf("[EmojiSeeder] seeded %d emoji packs and %d emojis\n", len(packs), len(defs))
	return nil
}

func init() {
	Register(&EmojiSeeder{})
}
