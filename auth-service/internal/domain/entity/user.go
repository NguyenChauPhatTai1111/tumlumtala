package entity

import "time"

type User struct {
	ID        uint64
	UUID      string
	Email     string
	Password  string
	Fullname  string
	Role      string
	CreatedAt time.Time
	UpdatedAt time.Time
}
