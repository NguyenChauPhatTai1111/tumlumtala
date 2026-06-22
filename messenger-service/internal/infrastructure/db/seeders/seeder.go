package seeders

import (
	"fmt"
	"sort"
	"time"

	"gorm.io/gorm"
)

type Seeder interface {
	Name() string
	Run(db *gorm.DB) error
}

var list []Seeder

func Register(s Seeder) {
	list = append(list, s)
}

func Run(db *gorm.DB, only []string, skip []string) error {
	ordered := append([]Seeder(nil), list...)
	sort.SliceStable(ordered, func(i, j int) bool {
		return seederPriority(ordered[i].Name()) < seederPriority(ordered[j].Name())
	})

	total := 0
	for _, seed := range ordered {
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

func seederPriority(name string) int {
	priorities := map[string]int{
		"EmojiSeeder":     10,
		"StickerSeeder":   20,
		"MessengerSeeder": 30,
	}
	if p, ok := priorities[name]; ok {
		return p
	}
	return 1000
}

func contains(list []string, v string) bool {
	for _, s := range list {
		if s == v {
			return true
		}
	}
	return false
}
