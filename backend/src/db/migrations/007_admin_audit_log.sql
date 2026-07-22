-- Immutable — aucune UPDATE/DELETE autorisée sur cette table
CREATE TABLE admin_audit_log (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    UUID        NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  action      VARCHAR(50) NOT NULL,
  target_type VARCHAR(20) NOT NULL,
  target_id   UUID        NOT NULL,
  reason      TEXT,
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_admin  ON admin_audit_log (admin_id);
CREATE INDEX idx_audit_target ON admin_audit_log (target_type, target_id);
CREATE INDEX idx_audit_date   ON admin_audit_log (created_at);
