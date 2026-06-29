CREATE TABLE IF NOT EXISTS music_library_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_uuid VARCHAR(36) NOT NULL,
    item_type ENUM('playlist', 'artist', 'album', 'radio') NOT NULL,
    source_id VARCHAR(128) NOT NULL,
    title VARCHAR(255) NOT NULL,
    subtitle VARCHAR(255) NULL,
    thumbnail TEXT NULL,
    metadata JSON NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY idx_music_library_user_item (user_uuid, item_type, source_id),
    INDEX idx_music_library_user_created (user_uuid, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
