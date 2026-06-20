CREATE TABLE IF NOT EXISTS movie_watch_history (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_uuid VARCHAR(36) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    name VARCHAR(500) NOT NULL,
    origin_name VARCHAR(500) NULL,
    thumbnail TEXT NULL,
    poster_url TEXT NULL,
    episode_name VARCHAR(100) NULL,
    episode_slug VARCHAR(255) NULL,
    type VARCHAR(50) NULL,
    year INT NULL DEFAULT 0,
    quality VARCHAR(50) NULL,
    lang VARCHAR(50) NULL,
    duration DOUBLE NOT NULL DEFAULT 0,
    watched_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_watched_position DOUBLE NOT NULL DEFAULT 0,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    rating VARCHAR(10) NULL DEFAULT NULL,

    UNIQUE KEY idx_movie_watch_user_slug_ep (user_uuid, slug, episode_slug),
    INDEX idx_movie_watch_history_user_watched (user_uuid, watched_at),
    INDEX idx_movie_watch_history_deleted (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS movie_search_history (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_uuid VARCHAR(36) NOT NULL,
    keyword VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_movie_search_history_user_updated (user_uuid, updated_at),
    INDEX idx_movie_search_history_user_keyword (user_uuid, keyword)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS movie_liked (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_uuid VARCHAR(36) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    name VARCHAR(500) NOT NULL,
    origin_name VARCHAR(500) NULL,
    thumbnail TEXT NULL,
    poster_url TEXT NULL,
    type VARCHAR(50) NULL,
    year INT NULL,
    quality VARCHAR(50) NULL,
    lang VARCHAR(50) NULL,
    rating VARCHAR(10) NULL DEFAULT NULL,
    liked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY idx_ml_user_slug (user_uuid, slug),
    INDEX idx_ml_user_at (user_uuid, liked_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
