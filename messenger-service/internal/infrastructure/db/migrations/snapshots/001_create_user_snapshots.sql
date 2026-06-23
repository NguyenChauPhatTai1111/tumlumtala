CREATE TABLE IF NOT EXISTS user_snapshots (
    id         BIGINT UNSIGNED NOT NULL PRIMARY KEY,
    uuid       CHAR(36)        NOT NULL,
    email      VARCHAR(320)    NOT NULL,
    fullname   VARCHAR(200)    NOT NULL DEFAULT '',
    role       VARCHAR(50)     NOT NULL DEFAULT 'member',
    created_at TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_user_snapshots_uuid (uuid),
    INDEX idx_user_snapshots_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
