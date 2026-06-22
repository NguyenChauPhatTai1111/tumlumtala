package seeders

import (
	"fmt"
	"time"

	"gorm.io/gorm"
)

type Seeder interface {
	Name() string
	Run(db *gorm.DB) error
}

// All khai báo danh sách và thứ tự các seeder sẽ được chạy.
// Thêm hoặc bỏ seeder tại đây để kiểm soát seeder nào được phép chạy.
func All() []Seeder {
	return []Seeder{
		&EmojiSeeder{},
		&StickerSeeder{},
		&ThemeSeeder{},
		&UserSnapshotSeeder{},
		&MessengerSeeder{},
	}
}

func Run(db *gorm.DB, only []string, skip []string) error {
	total := 0
	for _, seed := range All() {
		if len(only) > 0 && !contains(only, seed.Name()) {
			continue
		}
		if contains(skip, seed.Name()) {
			fmt.Printf("⏭  skip   %s\n", seed.Name())
			continue
		}

		fmt.Printf("→  run    %s\n", seed.Name())
		start := time.Now()

		if err := seed.Run(db); err != nil {
			fmt.Printf("✗  failed %s (%s)\n", seed.Name(), time.Since(start).Round(time.Millisecond))
			return fmt.Errorf("seeder %s failed: %w", seed.Name(), err)
		}

		fmt.Printf("✓  done   %s (%s)\n", seed.Name(), time.Since(start).Round(time.Millisecond))
		total++
	}

	fmt.Printf("\n✅ %d seeder(s) completed\n", total)
	return nil
}

func contains(list []string, v string) bool {
	for _, s := range list {
		if s == v {
			return true
		}
	}
	return false
}
