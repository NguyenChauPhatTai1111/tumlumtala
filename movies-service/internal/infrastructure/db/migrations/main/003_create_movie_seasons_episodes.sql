CREATE TABLE IF NOT EXISTS movie_seasons (
    id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    base_slug     VARCHAR(255)  NOT NULL,
    season_number INT           NOT NULL,
    season_slug   VARCHAR(255)  NOT NULL,
    name          VARCHAR(500)  NOT NULL DEFAULT '',
    fetched_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uq_ms_slug_season (base_slug, season_number),
    INDEX idx_ms_base_slug (base_slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS movie_episodes (
    id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    base_slug     VARCHAR(255)  NOT NULL,
    season_number INT           NOT NULL,
    server_name   VARCHAR(255)  NOT NULL,
    episode_name  VARCHAR(255)  NOT NULL DEFAULT '',
    episode_slug  VARCHAR(255)  NOT NULL,
    overview      TEXT         NULL,
    still_path    VARCHAR(500) NOT NULL DEFAULT '',
    filename      VARCHAR(500)  NULL,
    link_embed    TEXT          NULL,
    link_m3u8     TEXT          NULL,
    fetched_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uq_me_slug_season_server_ep (base_slug, season_number, server_name, episode_slug),
    INDEX idx_me_base_slug_season (base_slug, season_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
