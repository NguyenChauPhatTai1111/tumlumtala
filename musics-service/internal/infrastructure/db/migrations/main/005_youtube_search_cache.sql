CREATE TABLE IF NOT EXISTS youtube_search_queries (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    keyword VARCHAR(255) NOT NULL,
    normalized_keyword VARCHAR(255) NOT NULL,
    result_count INT UNSIGNED NOT NULL DEFAULT 0,
    cached_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,

    UNIQUE KEY idx_youtube_search_queries_normalized (normalized_keyword),
    INDEX idx_youtube_search_queries_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS youtube_tracks (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    search_query_id BIGINT UNSIGNED NOT NULL,
    keyword VARCHAR(255) NOT NULL,
    video_id VARCHAR(32) NOT NULL,
    title VARCHAR(500) NOT NULL,
    thumbnail TEXT NULL,
    channel_title VARCHAR(255) NULL,
    duration INT UNSIGNED NULL,
    view_count BIGINT UNSIGNED NOT NULL DEFAULT 0,
    published_at TIMESTAMP NULL,
    position INT UNSIGNED NOT NULL DEFAULT 0,
    cached_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY idx_youtube_tracks_query_video (search_query_id, video_id),
    INDEX idx_youtube_tracks_video_id (video_id),
    INDEX idx_youtube_tracks_query_position (search_query_id, position),
    INDEX idx_youtube_tracks_cached_at (cached_at),

    CONSTRAINT fk_youtube_tracks_search_query
        FOREIGN KEY (search_query_id)
        REFERENCES youtube_search_queries(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
