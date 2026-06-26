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

	type usersRow struct {
		ID       uint64 `gorm:"column:id"`
		UUID     string `gorm:"column:uuid"`
		Email    string `gorm:"column:email"`
		Fullname string `gorm:"column:fullname"`
		Avatar   string `gorm:"column:avatar"`
		Role     string `gorm:"column:role"`
		Status   string `gorm:"column:status"`
	}

	// Check whether the avatar column exists in the source table (tumlumtala_users.users).
	// The column may be absent if users-service migration 005 has not been applied yet.
	srcHasAvatar := columnExists(db, "tumlumtala_users", "users", "avatar")
	srcHasStatus := columnExists(db, "tumlumtala_users", "users", "status")
	dstHasAvatar := columnExists(db, "", "user_snapshots", "avatar")
	dstHasStatus := columnExists(db, "", "user_snapshots", "status")

	selectSQL := "SELECT id, uuid, email, fullname, '' AS avatar, role, 'active' AS status FROM tumlumtala_users.users ORDER BY id ASC"
	if srcHasAvatar {
		selectSQL = "SELECT id, uuid, email, fullname, COALESCE(avatar, '') AS avatar, role, 'active' AS status FROM tumlumtala_users.users ORDER BY id ASC"
	}
	if srcHasStatus {
		selectSQL = "SELECT id, uuid, email, fullname, '' AS avatar, role, status FROM tumlumtala_users.users ORDER BY id ASC"
		if srcHasAvatar {
			selectSQL = "SELECT id, uuid, email, fullname, COALESCE(avatar, '') AS avatar, role, status FROM tumlumtala_users.users ORDER BY id ASC"
		}
	}

	var users []usersRow
	if err := db.Raw(selectSQL).Scan(&users).Error; err != nil || len(users) == 0 {
		fmt.Printf("[UserSnapshotSeeder] could not read tumlumtala_users.users (%v) — skipping\n", err)
		return nil
	}

	for _, u := range users {
		var err error
		if dstHasAvatar && dstHasStatus {
			err = db.Exec(`
				INSERT INTO user_snapshots (id, uuid, email, fullname, avatar, role, status, created_at, updated_at)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
				ON DUPLICATE KEY UPDATE
					uuid       = VALUES(uuid),
					email      = VALUES(email),
					fullname   = VALUES(fullname),
					avatar     = VALUES(avatar),
					role       = VALUES(role),
					status     = VALUES(status),
					updated_at = VALUES(updated_at)
			`, u.ID, u.UUID, u.Email, u.Fullname, u.Avatar, u.Role, u.Status, now, now).Error
		} else if dstHasAvatar {
			err = db.Exec(`
				INSERT INTO user_snapshots (id, uuid, email, fullname, avatar, role, created_at, updated_at)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?)
				ON DUPLICATE KEY UPDATE
					uuid       = VALUES(uuid),
					email      = VALUES(email),
					fullname   = VALUES(fullname),
					avatar     = VALUES(avatar),
					role       = VALUES(role),
					updated_at = VALUES(updated_at)
			`, u.ID, u.UUID, u.Email, u.Fullname, u.Avatar, u.Role, now, now).Error
		} else if dstHasStatus {
			err = db.Exec(`
				INSERT INTO user_snapshots (id, uuid, email, fullname, role, status, created_at, updated_at)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?)
				ON DUPLICATE KEY UPDATE
					uuid       = VALUES(uuid),
					email      = VALUES(email),
					fullname   = VALUES(fullname),
					role       = VALUES(role),
					status     = VALUES(status),
					updated_at = VALUES(updated_at)
			`, u.ID, u.UUID, u.Email, u.Fullname, u.Role, u.Status, now, now).Error
		} else {
			err = db.Exec(`
				INSERT INTO user_snapshots (id, uuid, email, fullname, role, created_at, updated_at)
				VALUES (?, ?, ?, ?, ?, ?, ?)
				ON DUPLICATE KEY UPDATE
					uuid       = VALUES(uuid),
					email      = VALUES(email),
					fullname   = VALUES(fullname),
					role       = VALUES(role),
					updated_at = VALUES(updated_at)
			`, u.ID, u.UUID, u.Email, u.Fullname, u.Role, now, now).Error
		}
		if err != nil {
			return fmt.Errorf("upsert user_snapshot id=%d: %w", u.ID, err)
		}
	}

	fmt.Printf("[UserSnapshotSeeder] synced %d users from tumlumtala_users\n", len(users))
	return nil
}

// columnExists reports whether a column exists in the given table.
// Pass an empty schema to use the current database.
func columnExists(db *gorm.DB, schema, table, column string) bool {
	schemaExpr := "DATABASE()"
	args := []interface{}{table, column}
	if schema != "" {
		schemaExpr = "?"
		args = append([]interface{}{schema}, args...)
	}
	var count int64
	db.Raw(fmt.Sprintf(
		"SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = %s AND table_name = ? AND column_name = ?",
		schemaExpr,
	), args...).Scan(&count)
	return count > 0
}
