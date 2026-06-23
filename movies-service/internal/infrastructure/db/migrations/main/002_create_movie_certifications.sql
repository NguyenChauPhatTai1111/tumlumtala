CREATE TABLE IF NOT EXISTS movie_certifications (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(255) NOT NULL UNIQUE,
    tmdb_id VARCHAR(50) NOT NULL,
    tmdb_type VARCHAR(10) NOT NULL DEFAULT 'movie',
    rating VARCHAR(10) NOT NULL DEFAULT '',
    fetched_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_mc_tmdb_id (tmdb_id),
    INDEX idx_mc_fetched_at (fetched_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
