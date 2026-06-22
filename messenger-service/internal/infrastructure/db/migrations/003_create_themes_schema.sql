CREATE TABLE IF NOT EXISTS themes (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    preset_id VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    background TEXT NULL,
    background_color VARCHAR(50) NOT NULL DEFAULT '#ffffff',
    incoming_bubble_color VARCHAR(50) NOT NULL DEFAULT '#f0f0f0',
    outgoing_bubble_color VARCHAR(50) NOT NULL DEFAULT '#0084ff',
    incoming_text_color VARCHAR(50) NOT NULL DEFAULT '#000000',
    outgoing_text_color VARCHAR(50) NOT NULL DEFAULT '#ffffff',
    status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_themes_status ON themes(status, sort_order);
