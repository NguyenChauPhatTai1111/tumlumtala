SET @role_column_exists = (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'users'
      AND column_name = 'role'
);

SET @add_role_sql = IF(
    @role_column_exists = 0,
    'ALTER TABLE users ADD COLUMN role ENUM(''administrator'', ''member'', ''manager'') NOT NULL DEFAULT ''member'' AFTER fullname',
    'SELECT 1'
);

PREPARE add_role_statement FROM @add_role_sql;
EXECUTE add_role_statement;
DEALLOCATE PREPARE add_role_statement;
