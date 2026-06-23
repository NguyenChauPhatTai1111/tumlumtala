CREATE TABLE IF NOT EXISTS conversations (
    id INT AUTO_INCREMENT PRIMARY KEY,

    is_group BOOLEAN NOT NULL DEFAULT FALSE,
    name VARCHAR(255),

    theme_id INT NULL,
    theme_url TEXT NULL,

    background TEXT,
    background_color TEXT,
    incoming_bubble_color TEXT,
    outgoing_bubble_color TEXT,
    incoming_text_color TEXT,
    outgoing_text_color TEXT,
    custom_incoming_bubble_color VARCHAR(100) NULL,
    custom_outgoing_bubble_color VARCHAR(100) NULL,
    custom_incoming_text_color VARCHAR(100) NULL,
    custom_outgoing_text_color VARCHAR(100) NULL,
    quick_reaction VARCHAR(50) NULL DEFAULT '👍',
    avatar TEXT,

    created_by INT,

    last_message_content TEXT,
    last_message_sender_id INT,
    last_message_id INT,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_message_at TIMESTAMP,

    INDEX idx_conversations_last_message (last_message_at),
    INDEX idx_conversations_last_message_id (last_message_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS conversation_participants (
    id INT AUTO_INCREMENT PRIMARY KEY,

    conversation_id INT NOT NULL,
    user_id INT NOT NULL,

    role VARCHAR(20) NOT NULL DEFAULT 'member',
    nickname TEXT,
    notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP,
    messages_visible_from TIMESTAMP,
    unread_count INT NOT NULL DEFAULT 0,
    last_read_seq INT,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_read_at TIMESTAMP,

    UNIQUE KEY uq_participant (conversation_id, user_id),
    INDEX idx_participants_user_active (user_id, is_archived, deleted_at),
    INDEX idx_participants_user_conv (user_id, conversation_id),
    INDEX idx_participants_last_read_seq (conversation_id, user_id, last_read_seq),
    CONSTRAINT fk_participant_conversation FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS messages (
    id INT AUTO_INCREMENT PRIMARY KEY,

    conversation_id INT NOT NULL,
    sender_id INT NOT NULL,

    content TEXT,
    message_type VARCHAR(20) NOT NULL DEFAULT 'text',
    metadata JSON NOT NULL,

    reply_to_message_id INT,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,

    INDEX idx_messages_conv_created (conversation_id, created_at),
    INDEX idx_messages_conv_sender (conversation_id, sender_id),
    INDEX idx_messages_reply_to (reply_to_message_id),
    CONSTRAINT fk_message_conversation FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    CONSTRAINT fk_message_reply FOREIGN KEY (reply_to_message_id) REFERENCES messages(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS message_histories (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    message_id INT NOT NULL,
    edited_by INT NOT NULL,
    content TEXT,
    edited_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_message_histories_message (message_id, edited_at),
    INDEX idx_message_histories_editor (edited_by, edited_at),
    CONSTRAINT fk_history_message FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS conversation_activities (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    conversation_id INT NOT NULL,
    actor_user_id INT NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    target_user_id INT,
    content TEXT,
    metadata JSON,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_conv_activity_conversation (conversation_id),
    INDEX idx_conv_activity_actor (actor_user_id),
    INDEX idx_conv_activity_created (created_at),
    INDEX idx_conv_activity_action (action_type),

    CONSTRAINT fk_activity_conversation FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @fk_exists = (
    SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND TABLE_NAME = 'conversations'
      AND CONSTRAINT_NAME = 'fk_conversations_last_message'
      AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);
SET @sql = IF(@fk_exists = 0,
    'ALTER TABLE conversations ADD CONSTRAINT fk_conversations_last_message FOREIGN KEY (last_message_id) REFERENCES messages(id) ON DELETE SET NULL',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

