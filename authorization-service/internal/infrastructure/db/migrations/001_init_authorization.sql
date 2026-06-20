CREATE TABLE IF NOT EXISTS roles (
    id   INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(64)  NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO roles (id, name) VALUES
    (1, 'administrator'),
    (2, 'manager'),
    (3, 'member');

CREATE TABLE IF NOT EXISTS permissions (
    id          INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    code        VARCHAR(128) NOT NULL UNIQUE,
    description VARCHAR(255) NOT NULL DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO permissions (code, description) VALUES
    ('user.read',    'View user information'),
    ('user.create',  'Create a new user'),
    ('user.update',  'Update user information'),
    ('user.delete',  'Delete a user'),
    ('order.read',   'View orders'),
    ('order.create', 'Create an order'),
    ('order.update', 'Update an order'),
    ('order.delete', 'Delete an order'),
    ('product.read',   'View products'),
    ('product.create', 'Create a product'),
    ('product.update', 'Update a product'),
    ('product.delete', 'Delete a product');

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id       INT UNSIGNED NOT NULL,
    permission_id INT UNSIGNED NOT NULL,
    PRIMARY KEY (role_id, permission_id),
    CONSTRAINT fk_rp_role       FOREIGN KEY (role_id)       REFERENCES roles(id)       ON DELETE CASCADE,
    CONSTRAINT fk_rp_permission FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- administrator: full access
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions;

-- manager: all except user.delete
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT 2, id FROM permissions WHERE code != 'user.delete';

-- member: read-only
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT 3, id FROM permissions WHERE code IN ('user.read', 'order.read', 'product.read');

-- user_roles: maps user UUID (from users-service) → role in authorization-service
CREATE TABLE IF NOT EXISTS user_roles (
    user_uuid CHAR(36)     NOT NULL,
    role_id   INT UNSIGNED NOT NULL,
    PRIMARY KEY (user_uuid, role_id),
    CONSTRAINT fk_ur_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    INDEX idx_user_roles_uuid (user_uuid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
