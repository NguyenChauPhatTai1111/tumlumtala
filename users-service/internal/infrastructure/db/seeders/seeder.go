package seeders

import "context"

type Seeder interface {
	Name() string
	Run(ctx context.Context) error
}
