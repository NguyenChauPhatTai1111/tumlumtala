CREATE TABLE IF NOT EXISTS call_sessions (
    id CHAR(36) PRIMARY KEY,
    conversation_id INT NOT NULL,
    caller_id INT NOT NULL,
    receiver_id INT NOT NULL,
    call_type VARCHAR(20) NOT NULL,
    status VARCHAR(30) NOT NULL,
    started_at TIMESTAMP NULL,
    ended_at TIMESTAMP NULL,
    duration_seconds INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_call_sessions_conversation (conversation_id),
    INDEX idx_call_sessions_caller (caller_id),
    INDEX idx_call_sessions_receiver (receiver_id),
    INDEX idx_call_sessions_created (created_at),
    CONSTRAINT chk_call_sessions_type CHECK (call_type IN ('audio', 'video')),
    CONSTRAINT chk_call_sessions_status CHECK (
        status IN ('initiated', 'ringing', 'accepted', 'rejected', 'missed', 'cancelled', 'ended', 'failed', 'busy')
    ),
    CONSTRAINT fk_call_sessions_conversation FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
