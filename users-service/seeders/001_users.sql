-- Password for all seeded users: password
INSERT INTO users (id, email, password, fullname, role, created_at, updated_at) VALUES
('00000000-0000-4000-8000-000000000001', 'admin@tumlumtala.local',   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'System Administrator', 'administrator', UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)),
('00000000-0000-4000-8000-000000000002', 'manager1@tumlumtala.local','$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Nguyen Minh Quan',      'manager',       UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)),
('00000000-0000-4000-8000-000000000003', 'manager2@tumlumtala.local','$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Tran Thu Ha',           'manager',       UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)),
('00000000-0000-4000-8000-000000000004', 'member1@tumlumtala.local', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Le Hoang Nam',          'member',        UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)),
('00000000-0000-4000-8000-000000000005', 'member2@tumlumtala.local', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Pham Ngoc Anh',         'member',        UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)),
('00000000-0000-4000-8000-000000000006', 'member3@tumlumtala.local', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Do Thanh Tung',         'member',        UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)),
('00000000-0000-4000-8000-000000000007', 'member4@tumlumtala.local', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Vu Mai Linh',           'member',        UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)),
('00000000-0000-4000-8000-000000000008', 'member5@tumlumtala.local', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Bui Gia Huy',           'member',        UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)),
('00000000-0000-4000-8000-000000000009', 'member6@tumlumtala.local', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Hoang Bao Chau',        'member',        UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)),
('00000000-0000-4000-8000-000000000010', 'member7@tumlumtala.local', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Dang Quoc Viet',        'member',        UTC_TIMESTAMP(6), UTC_TIMESTAMP(6))
ON DUPLICATE KEY UPDATE
    fullname = VALUES(fullname),
    role = VALUES(role),
    updated_at = VALUES(updated_at);
