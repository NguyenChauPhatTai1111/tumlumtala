-- Tracks every meaningful playback interaction for AI training
CREATE TABLE IF NOT EXISTS music_listening_events (
    id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_uuid     VARCHAR(36)  NOT NULL,
    media_item_id BIGINT UNSIGNED NOT NULL,
    source_id     VARCHAR(128) NOT NULL,
    event_type    ENUM('play','skip','complete','like','unlike','repeat') NOT NULL,
    -- seconds the user actually listened before the event fired
    listen_duration INT UNSIGNED NOT NULL DEFAULT 0,
    -- total track duration at time of event (for ratio calculation)
    track_duration  INT UNSIGNED NOT NULL DEFAULT 0,
    -- genre/mood metadata snapshotted at event time for DNA analysis
    genre         VARCHAR(100) NULL,
    occurred_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_le_user_occurred  (user_uuid, occurred_at),
    INDEX idx_le_user_event     (user_uuid, event_type),
    INDEX idx_le_media_item     (media_item_id),
    INDEX idx_le_user_genre     (user_uuid, genre),

    CONSTRAINT fk_le_media_item
        FOREIGN KEY (media_item_id)
        REFERENCES music_media_items(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Aggregated listening DNA per user, rebuilt periodically from listening_events
CREATE TABLE IF NOT EXISTS music_user_dna (
    id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_uuid      VARCHAR(36)  NOT NULL,
    genre          VARCHAR(100) NOT NULL,
    play_count     INT UNSIGNED NOT NULL DEFAULT 0,
    -- sum of listen_duration / track_duration ratios × 100 (0-100 per event)
    completion_sum INT UNSIGNED NOT NULL DEFAULT 0,
    skip_count     INT UNSIGNED NOT NULL DEFAULT 0,
    last_played_at TIMESTAMP    NULL,
    updated_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY idx_dna_user_genre (user_uuid, genre),
    INDEX idx_dna_user_updated   (user_uuid, updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
