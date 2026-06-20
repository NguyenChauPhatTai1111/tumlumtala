package seeders

import (
	"context"
	"fmt"
	"log"
)

func Run(ctx context.Context, list ...Seeder) error {
	for _, seeder := range list {
		log.Printf("→ running %s", seeder.Name())
		if err := seeder.Run(ctx); err != nil {
			return fmt.Errorf("seeder %s failed: %w", seeder.Name(), err)
		}
		log.Printf("✅ %s completed", seeder.Name())
	}
	return nil
}
