CREATE TABLE IF NOT EXISTS webauthn_credentials (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_uuid       VARCHAR(36)     NOT NULL,
  credential_id   VARBINARY(1024) NOT NULL,
  public_key      BLOB            NOT NULL,
  aaguid          VARBINARY(16),
  sign_count      INT UNSIGNED    NOT NULL DEFAULT 0,
  transports      TEXT,
  backup_eligible TINYINT(1)      NOT NULL DEFAULT 0,
  backup_state    TINYINT(1)      NOT NULL DEFAULT 0,
  created_at      DATETIME(6)     NOT NULL,
  last_used_at    DATETIME(6)     NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_credential_id (credential_id(255)),
  KEY idx_user_uuid (user_uuid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
