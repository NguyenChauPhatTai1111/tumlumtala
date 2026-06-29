-- Rich playback telemetry. MySQL does not support ADD COLUMN IF NOT EXISTS,
-- so every additive DDL is guarded through information_schema.
DROP PROCEDURE IF EXISTS ensure_music_column;
DELIMITER //
CREATE PROCEDURE ensure_music_column(
    IN table_name_value VARCHAR(64),
    IN column_name_value VARCHAR(64),
    IN ddl_value TEXT
)
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns AS c
        WHERE c.table_schema = DATABASE()
          AND c.table_name = table_name_value
          AND c.column_name = column_name_value
    ) THEN
        SET @music_column_ddl = ddl_value;
        PREPARE music_column_statement FROM @music_column_ddl;
        EXECUTE music_column_statement;
        DEALLOCATE PREPARE music_column_statement;
    END IF;
END//
DELIMITER ;

CALL ensure_music_column('music_media_items', 'genre',
    'ALTER TABLE music_media_items ADD COLUMN genre VARCHAR(100) NULL AFTER view_count');
CALL ensure_music_column('music_media_items', 'mood',
    'ALTER TABLE music_media_items ADD COLUMN mood VARCHAR(100) NULL AFTER genre');
CALL ensure_music_column('music_media_items', 'energy',
    'ALTER TABLE music_media_items ADD COLUMN energy DECIMAL(5,4) NULL AFTER mood');
CALL ensure_music_column('music_media_items', 'tempo',
    'ALTER TABLE music_media_items ADD COLUMN tempo DECIMAL(7,2) NULL AFTER energy');
CALL ensure_music_column('music_media_items', 'musical_key',
    'ALTER TABLE music_media_items ADD COLUMN musical_key VARCHAR(20) NULL AFTER tempo');
CALL ensure_music_column('music_media_items', 'is_instrumental',
    'ALTER TABLE music_media_items ADD COLUMN is_instrumental BOOLEAN NULL AFTER musical_key');
CALL ensure_music_column('music_media_items', 'vocal_gender',
    'ALTER TABLE music_media_items ADD COLUMN vocal_gender VARCHAR(24) NULL AFTER is_instrumental');
CALL ensure_music_column('music_media_items', 'like_count',
    'ALTER TABLE music_media_items ADD COLUMN like_count BIGINT NOT NULL DEFAULT 0 AFTER vocal_gender');
CALL ensure_music_column('music_media_items', 'repost_count',
    'ALTER TABLE music_media_items ADD COLUMN repost_count BIGINT NOT NULL DEFAULT 0 AFTER like_count');
CALL ensure_music_column('music_media_items', 'tags',
    'ALTER TABLE music_media_items ADD COLUMN tags TEXT NULL AFTER repost_count');

CALL ensure_music_column('music_listening_events', 'event_uuid',
    'ALTER TABLE music_listening_events ADD COLUMN event_uuid VARCHAR(36) NULL AFTER id');
CALL ensure_music_column('music_listening_events', 'session_id',
    'ALTER TABLE music_listening_events ADD COLUMN session_id VARCHAR(36) NULL AFTER user_uuid');
CALL ensure_music_column('music_listening_events', 'context',
    'ALTER TABLE music_listening_events ADD COLUMN context VARCHAR(32) NOT NULL DEFAULT ''organic'' AFTER session_id');
CALL ensure_music_column('music_listening_events', 'position_ms',
    'ALTER TABLE music_listening_events ADD COLUMN position_ms INT UNSIGNED NOT NULL DEFAULT 0 AFTER track_duration');
CALL ensure_music_column('music_listening_events', 'completion_ratio',
    'ALTER TABLE music_listening_events ADD COLUMN completion_ratio DECIMAL(5,4) NOT NULL DEFAULT 0 AFTER position_ms');
CALL ensure_music_column('music_listening_events', 'previous_source_id',
    'ALTER TABLE music_listening_events ADD COLUMN previous_source_id VARCHAR(128) NULL AFTER source_id');
CALL ensure_music_column('music_listening_events', 'recommendation_reason',
    'ALTER TABLE music_listening_events ADD COLUMN recommendation_reason VARCHAR(255) NULL AFTER previous_source_id');
CALL ensure_music_column('music_listening_events', 'mood',
    'ALTER TABLE music_listening_events ADD COLUMN mood VARCHAR(100) NULL AFTER genre');
CALL ensure_music_column('music_listening_events', 'energy',
    'ALTER TABLE music_listening_events ADD COLUMN energy DECIMAL(5,4) NULL AFTER mood');
CALL ensure_music_column('music_listening_events', 'tempo',
    'ALTER TABLE music_listening_events ADD COLUMN tempo DECIMAL(7,2) NULL AFTER energy');
CALL ensure_music_column('music_listening_events', 'musical_key',
    'ALTER TABLE music_listening_events ADD COLUMN musical_key VARCHAR(20) NULL AFTER tempo');
CALL ensure_music_column('music_listening_events', 'is_instrumental',
    'ALTER TABLE music_listening_events ADD COLUMN is_instrumental BOOLEAN NULL AFTER musical_key');
CALL ensure_music_column('music_listening_events', 'vocal_gender',
    'ALTER TABLE music_listening_events ADD COLUMN vocal_gender VARCHAR(24) NULL AFTER is_instrumental');
CALL ensure_music_column('music_listening_events', 'listening_hour',
    'ALTER TABLE music_listening_events ADD COLUMN listening_hour TINYINT UNSIGNED NOT NULL DEFAULT 0 AFTER vocal_gender');
CALL ensure_music_column('music_listening_events', 'day_of_week',
    'ALTER TABLE music_listening_events ADD COLUMN day_of_week TINYINT UNSIGNED NOT NULL DEFAULT 0 AFTER listening_hour');
DROP PROCEDURE ensure_music_column;

DROP PROCEDURE IF EXISTS ensure_music_index;
DELIMITER //
CREATE PROCEDURE ensure_music_index(
    IN table_name_value VARCHAR(64),
    IN index_name_value VARCHAR(64),
    IN ddl_value TEXT
)
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.statistics
        WHERE table_schema = DATABASE()
          AND table_name = table_name_value
          AND index_name = index_name_value
    ) THEN
        SET @music_index_ddl = ddl_value;
        PREPARE music_index_statement FROM @music_index_ddl;
        EXECUTE music_index_statement;
        DEALLOCATE PREPARE music_index_statement;
    END IF;
END//
DELIMITER ;

CALL ensure_music_index('music_listening_events', 'idx_music_event_uuid',
    'CREATE UNIQUE INDEX idx_music_event_uuid ON music_listening_events(event_uuid)');
CALL ensure_music_index('music_listening_events', 'idx_music_event_session',
    'CREATE INDEX idx_music_event_session ON music_listening_events(user_uuid, session_id, occurred_at)');
CALL ensure_music_index('music_listening_events', 'idx_music_event_transition',
    'CREATE INDEX idx_music_event_transition ON music_listening_events(previous_source_id, source_id)');
CALL ensure_music_index('music_listening_events', 'idx_music_event_heatmap',
    'CREATE INDEX idx_music_event_heatmap ON music_listening_events(user_uuid, day_of_week, listening_hour)');
DROP PROCEDURE ensure_music_index;

CREATE TABLE IF NOT EXISTS music_dna_dimensions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_uuid VARCHAR(36) NOT NULL,
    dimension_type VARCHAR(32) NOT NULL,
    dimension_value VARCHAR(128) NOT NULL,
    positive_score DECIMAL(12,4) NOT NULL DEFAULT 0,
    negative_score DECIMAL(12,4) NOT NULL DEFAULT 0,
    play_count INT UNSIGNED NOT NULL DEFAULT 0,
    completion_sum DECIMAL(14,4) NOT NULL DEFAULT 0,
    skip_count INT UNSIGNED NOT NULL DEFAULT 0,
    last_interaction_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY idx_music_dna_dimension (user_uuid, dimension_type, dimension_value),
    INDEX idx_music_dna_type_score (user_uuid, dimension_type, positive_score),
    INDEX idx_music_dna_updated (user_uuid, updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS music_ai_sessions (
    id VARCHAR(36) PRIMARY KEY,
    user_uuid VARCHAR(36) NOT NULL,
    mode VARCHAR(24) NOT NULL DEFAULT 'dj',
    prompt TEXT NOT NULL,
    title VARCHAR(255) NOT NULL,
    assistant_message TEXT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'planning',
    plan JSON NOT NULL,
    context JSON NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_music_ai_session_user (user_uuid, updated_at),
    INDEX idx_music_ai_session_mode (user_uuid, mode, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS music_ai_messages (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(36) NOT NULL,
    role VARCHAR(16) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_music_ai_message_session (session_id, id),
    CONSTRAINT fk_music_ai_message_session
        FOREIGN KEY (session_id) REFERENCES music_ai_sessions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS music_ai_session_tracks (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(36) NOT NULL,
    media_item_id BIGINT UNSIGNED NOT NULL,
    position INT UNSIGNED NOT NULL,
    phase VARCHAR(32) NOT NULL,
    score DECIMAL(8,4) NOT NULL DEFAULT 0,
    energy_target DECIMAL(5,4) NOT NULL DEFAULT 0,
    reason VARCHAR(255) NULL,
    scheduled_minute INT UNSIGNED NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY idx_music_ai_track_position (session_id, position),
    INDEX idx_music_ai_track_media (media_item_id),
    CONSTRAINT fk_music_ai_track_session
        FOREIGN KEY (session_id) REFERENCES music_ai_sessions(id) ON DELETE CASCADE,
    CONSTRAINT fk_music_ai_track_media
        FOREIGN KEY (media_item_id) REFERENCES music_media_items(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS music_challenge_progress (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_uuid VARCHAR(36) NOT NULL,
    challenge_key VARCHAR(64) NOT NULL,
    period_key VARCHAR(16) NOT NULL,
    progress INT UNSIGNED NOT NULL DEFAULT 0,
    target INT UNSIGNED NOT NULL DEFAULT 0,
    completed_at TIMESTAMP NULL,
    claimed_at TIMESTAMP NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY idx_music_challenge_user_period (user_uuid, challenge_key, period_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS music_sync_rooms (
    id VARCHAR(36) PRIMARY KEY,
    invite_code VARCHAR(12) NOT NULL,
    owner_uuid VARCHAR(36) NOT NULL,
    guest_uuid VARCHAR(36) NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'waiting',
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY idx_music_sync_invite (invite_code),
    INDEX idx_music_sync_participants (owner_uuid, guest_uuid, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
