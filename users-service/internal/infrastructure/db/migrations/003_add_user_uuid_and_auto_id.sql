-- Migrate the legacy schema where UUID values were stored in the primary key
-- `id`. Each operation is conditional so this migration can be rerun safely.

SET @uuid_column_exists = (
    SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'uuid'
);
SET @legacy_id_exists = (
    SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'users'
      AND column_name = 'id' AND data_type IN ('char', 'varchar')
);
SET @rename_id_sql = IF(
    @uuid_column_exists = 0 AND @legacy_id_exists = 1,
    'ALTER TABLE users CHANGE COLUMN id uuid CHAR(36) NOT NULL',
    'DO 0'
);
PREPARE rename_id_statement FROM @rename_id_sql;
EXECUTE rename_id_statement;
DEALLOCATE PREPARE rename_id_statement;

SET @uuid_is_primary = (
    SELECT COUNT(*) FROM information_schema.statistics
    WHERE table_schema = DATABASE() AND table_name = 'users'
      AND index_name = 'PRIMARY' AND column_name = 'uuid'
);
SET @drop_legacy_pk_sql = IF(
    @uuid_is_primary = 1,
    'ALTER TABLE users DROP PRIMARY KEY',
    'DO 0'
);
PREPARE drop_legacy_pk_statement FROM @drop_legacy_pk_sql;
EXECUTE drop_legacy_pk_statement;
DEALLOCATE PREPARE drop_legacy_pk_statement;

SET @numeric_id_exists = (
    SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'users'
      AND column_name = 'id' AND data_type IN ('bigint', 'int')
);
SET @add_numeric_id_sql = IF(
    @numeric_id_exists = 0,
    'ALTER TABLE users ADD COLUMN id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY FIRST',
    'DO 0'
);
PREPARE add_numeric_id_statement FROM @add_numeric_id_sql;
EXECUTE add_numeric_id_statement;
DEALLOCATE PREPARE add_numeric_id_statement;

SET @uuid_unique_exists = (
    SELECT COUNT(*) FROM information_schema.statistics
    WHERE table_schema = DATABASE() AND table_name = 'users'
      AND column_name = 'uuid' AND non_unique = 0
);
SET @add_uuid_unique_sql = IF(
    @uuid_unique_exists = 0,
    'ALTER TABLE users ADD UNIQUE INDEX uq_users_uuid (uuid)',
    'DO 0'
);
PREPARE add_uuid_unique_statement FROM @add_uuid_unique_sql;
EXECUTE add_uuid_unique_statement;
DEALLOCATE PREPARE add_uuid_unique_statement;
