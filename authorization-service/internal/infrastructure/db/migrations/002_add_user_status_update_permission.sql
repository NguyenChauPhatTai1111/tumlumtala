INSERT IGNORE INTO permissions (code, description) VALUES
    ('user.status.update', 'Update user active/inactive status');

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code = 'user.status.update'
WHERE r.name IN ('administrator', 'manager');
