-- Tạo bảng roles nếu chưa có
CREATE TABLE IF NOT EXISTS roles (
    id   INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(64)  NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed 3 roles mặc định
INSERT IGNORE INTO roles (id, name) VALUES
    (1, 'administrator'),
    (2, 'manager'),
    (3, 'member');

-- Thêm cột role_id nếu chưa có
SET @role_id_exists = (
    SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'role_id'
);
SET @add_role_id_sql = IF(
    @role_id_exists = 0,
    'ALTER TABLE users ADD COLUMN role_id INT UNSIGNED NOT NULL DEFAULT 3 AFTER role',
    'DO 0'
);
PREPARE stmt FROM @add_role_id_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Backfill role_id từ role ENUM
UPDATE users SET role_id = 1 WHERE role = 'administrator';
UPDATE users SET role_id = 2 WHERE role = 'manager';
UPDATE users SET role_id = 3 WHERE role = 'member';
