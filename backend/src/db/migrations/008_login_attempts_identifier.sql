-- Le login se fait désormais par pseudo (et non email) : la colonne de tracking
-- du brute-force est renommée pour refléter l'identifiant réellement soumis.
ALTER TABLE login_attempts RENAME COLUMN email TO identifier;

DROP INDEX IF EXISTS idx_login_attempts_email_time;
CREATE INDEX idx_login_attempts_identifier_time ON login_attempts (identifier, attempted_at);
