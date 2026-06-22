package seeders

import (
	"context"
	"fmt"
	"log"
	"time"
)

type Seeder interface {
	Name() string
	Run(ctx context.Context) error
}

// Run chạy các seeder theo thứ tự khai báo.
// Nếu only không rỗng, chỉ chạy seeder có tên nằm trong list.
func Run(ctx context.Context, only []string, list []Seeder) error {
	for _, seeder := range list {
		if len(only) > 0 && !contains(only, seeder.Name()) {
			log.Printf("⏭  skip   %s", seeder.Name())
			continue
		}

		log.Printf("→  run    %s", seeder.Name())
		start := time.Now()

		if err := seeder.Run(ctx); err != nil {
			return fmt.Errorf("seeder %s failed: %w", seeder.Name(), err)
		}

		log.Printf("✓  done   %s (%s)", seeder.Name(), time.Since(start).Round(time.Millisecond))
	}
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
