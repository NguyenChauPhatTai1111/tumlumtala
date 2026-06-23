package events

import "time"

// UserCreatedEvent published by users-service when a user is created.
type UserCreatedEvent struct {
	ID        uint64    `json:"id"`
	UUID      string    `json:"uuid"`
	Email     string    `json:"email"`
	Fullname  string    `json:"fullname"`
	Avatar    string    `json:"avatar"`
	Role      string    `json:"role"`
	CreatedAt time.Time `json:"created_at"`
}

// UserUpdatedEvent published by users-service when a user's profile changes.
type UserUpdatedEvent struct {
	ID       uint64 `json:"id"`
	UUID     string `json:"uuid"`
	Email    string `json:"email"`
	Fullname string `json:"fullname"`
	Avatar   string `json:"avatar"`
	Role     string `json:"role"`
}

// UserDeletedEvent published by users-service when a user is deleted.
type UserDeletedEvent struct {
	ID   uint64 `json:"id"`
	UUID string `json:"uuid"`
}

// UserUpsertedEvent published by cmd/replay for bulk re-sync.
// Same fields as UserUpdatedEvent — consumers treat it as an idempotent upsert.
type UserUpsertedEvent struct {
	ID       uint64 `json:"id"`
	UUID     string `json:"uuid"`
	Email    string `json:"email"`
	Fullname string `json:"fullname"`
	Avatar   string `json:"avatar"`
	Role     string `json:"role"`
}
