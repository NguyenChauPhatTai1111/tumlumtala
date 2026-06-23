SET @avatar_exists = (
    SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'user_snapshots' AND column_name = 'avatar'
);
SET @add_avatar_sql = IF(
    @avatar_exists = 0,
    'ALTER TABLE user_snapshots ADD COLUMN avatar TEXT NULL AFTER fullname',
    'DO 0'
);
PREPARE stmt FROM @add_avatar_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
