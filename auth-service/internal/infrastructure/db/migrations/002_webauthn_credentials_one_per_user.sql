-- Each account has exactly one biometric (Face ID / Touch ID) credential.
ALTER TABLE webauthn_credentials
  ADD CONSTRAINT uq_webauthn_user_uuid UNIQUE (user_uuid);
