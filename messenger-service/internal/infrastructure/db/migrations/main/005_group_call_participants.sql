-- Add is_group column if not exists
SET @col_exists = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'call_sessions'
      AND COLUMN_NAME  = 'is_group'
);
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE call_sessions ADD COLUMN is_group TINYINT(1) NOT NULL DEFAULT 0',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add max_participants column if not exists
SET @col_exists = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'call_sessions'
      AND COLUMN_NAME  = 'max_participants'
);
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE call_sessions ADD COLUMN max_participants INT NOT NULL DEFAULT 8',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Make receiver_id nullable if it is not already
SET @nullable = (
    SELECT IS_NULLABLE FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'call_sessions'
      AND COLUMN_NAME  = 'receiver_id'
);
SET @sql = IF(@nullable = 'NO',
    'ALTER TABLE call_sessions MODIFY COLUMN receiver_id INT NULL',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Create call_session_participants table if not exists
CREATE TABLE IF NOT EXISTS call_session_participants (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    call_id     CHAR(36)       NOT NULL,
    user_id     INT            NOT NULL,
    status      VARCHAR(20)    NOT NULL DEFAULT 'invited',
    joined_at   TIMESTAMP      NULL,
    left_at     TIMESTAMP      NULL,
    created_at  TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_csp_call   (call_id),
    INDEX idx_csp_user   (user_id),
    UNIQUE KEY uq_csp_call_user (call_id, user_id),
    CONSTRAINT chk_csp_status CHECK (status IN ('invited', 'joined', 'left', 'declined', 'missed')),
    CONSTRAINT fk_csp_call FOREIGN KEY (call_id) REFERENCES call_sessions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
