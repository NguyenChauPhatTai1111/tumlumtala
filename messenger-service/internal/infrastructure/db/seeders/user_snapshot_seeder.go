package seeders

import (
	"fmt"
	"time"

	"gorm.io/gorm"
)

type UserSnapshotSeeder struct{}

func (s *UserSnapshotSeeder) Name() string { return "UserSnapshotSeeder" }

func (s *UserSnapshotSeeder) Run(db *gorm.DB) error {
	now := time.Now()

	// Đọc users từ tumlumtala_users.users (cùng MySQL server).
	// Nếu DB users chưa sẵn sàng hoặc không có data, fallback sang seed tĩnh.
	type usersRow struct {
		ID       uint64 `gorm:"column:id"`
		UUID     string `gorm:"column:uuid"`
		Email    string `gorm:"column:email"`
		Fullname string `gorm:"column:fullname"`
		Role     string `gorm:"column:role"`
	}

	var users []usersRow
	if err := db.Raw("SELECT id, uuid, email, fullname, role FROM tumlumtala_users.users ORDER BY id ASC").Scan(&users).Error; err != nil || len(users) == 0 {
		fmt.Printf("[UserSnapshotSeeder] could not read tumlumtala_users.users (%v) — skipping\n", err)
		return nil
	}

	for _, u := range users {
		if err := db.Exec(`
			INSERT INTO user_snapshots (id, uuid, email, fullname, role, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, ?)
			ON DUPLICATE KEY UPDATE
				uuid     = VALUES(uuid),
				email    = VALUES(email),
				fullname = VALUES(fullname),
				role     = VALUES(role),
				updated_at = VALUES(updated_at)
		`, u.ID, u.UUID, u.Email, u.Fullname, u.Role, now, now).Error; err != nil {
			return fmt.Errorf("upsert user_snapshot id=%d: %w", u.ID, err)
		}
	}

	fmt.Printf("[UserSnapshotSeeder] synced %d users from tumlumtala_users\n", len(users))
	return nil
}
