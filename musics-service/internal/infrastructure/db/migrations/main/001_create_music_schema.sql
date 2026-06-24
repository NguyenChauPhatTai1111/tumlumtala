CREATE TABLE IF NOT EXISTS music_media_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_uuid VARCHAR(36) NOT NULL,
    source_id VARCHAR(128) NOT NULL,
    type ENUM('audio', 'video') NOT NULL,
    title VARCHAR(255) NOT NULL,
    artist VARCHAR(255) NULL,
    thumbnail TEXT NULL,
    stream_url TEXT NULL,
    video_id VARCHAR(128) NULL,
    duration INT NULL,
    view_count BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY idx_music_user_source (user_uuid, source_id, type),
    INDEX idx_music_media_items_user_type (user_uuid, type),
    INDEX idx_music_media_items_video_id (video_id),
    INDEX idx_music_media_items_view_count (view_count)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS music_liked_tracks (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_uuid VARCHAR(36) NOT NULL,
    media_item_id BIGINT UNSIGNED NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY idx_music_liked_user_media (user_uuid, media_item_id),
    INDEX idx_music_liked_tracks_user_created (user_uuid, created_at),

    CONSTRAINT fk_music_liked_tracks_media_item
        FOREIGN KEY (media_item_id)
        REFERENCES music_media_items(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS music_recent_tracks (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_uuid VARCHAR(36) NOT NULL,
    media_item_id BIGINT UNSIGNED NOT NULL,
    played_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_music_recent_tracks_user_played (user_uuid, played_at),
    INDEX idx_music_recent_tracks_media_item (media_item_id),

    CONSTRAINT fk_music_recent_tracks_media_item
        FOREIGN KEY (media_item_id)
        REFERENCES music_media_items(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS music_search_history (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_uuid VARCHAR(36) NOT NULL,
    keyword VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_music_search_history_user_created (user_uuid, created_at),
    INDEX idx_music_search_history_user_updated (user_uuid, updated_at),
    INDEX idx_music_search_history_keyword (keyword),
    INDEX idx_music_search_history_user_keyword (user_uuid, keyword)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS music_playlists (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_uuid VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    cover TEXT NULL,
    description TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_music_playlists_user_updated (user_uuid, updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS music_playlist_tracks (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    playlist_id BIGINT UNSIGNED NOT NULL,
    media_item_id BIGINT UNSIGNED NOT NULL,
    position INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY idx_music_playlist_track (playlist_id, media_item_id),
    INDEX idx_music_playlist_tracks_playlist_position (playlist_id, position),
    INDEX idx_music_playlist_tracks_media_item (media_item_id),

    CONSTRAINT fk_music_playlist_tracks_playlist
        FOREIGN KEY (playlist_id)
        REFERENCES music_playlists(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_music_playlist_tracks_media_item
        FOREIGN KEY (media_item_id)
        REFERENCES music_media_items(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
