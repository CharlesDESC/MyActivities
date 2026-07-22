-- ─── Users ────────────────────────────────────────────────────────────────────
CREATE TABLE users (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  email               VARCHAR(255) NOT NULL UNIQUE,
  pseudo              VARCHAR(30)  NOT NULL UNIQUE,
  password_hash       VARCHAR(60)  NOT NULL,
  role                user_role    NOT NULL DEFAULT 'member',
  status              user_status  NOT NULL DEFAULT 'active',
  avatar_url          TEXT,
  email_verified      BOOLEAN      NOT NULL DEFAULT false,
  geolocation_consent BOOLEAN      NOT NULL DEFAULT false,
  suspended_until     TIMESTAMPTZ,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
  deleted_at          TIMESTAMPTZ
);

CREATE INDEX idx_users_email  ON users (email);
CREATE INDEX idx_users_pseudo ON users (pseudo);
CREATE INDEX idx_users_status ON users (status);
CREATE INDEX idx_users_role   ON users (role);

-- ─── Refresh tokens ────────────────────────────────────────────────────────────
CREATE TABLE refresh_tokens (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash  VARCHAR(64) NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens (token_hash);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens (user_id);

-- ─── Password reset tokens ────────────────────────────────────────────────────
CREATE TABLE password_reset_tokens (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash  VARCHAR(64) NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pwd_reset_hash ON password_reset_tokens (token_hash);
CREATE INDEX idx_pwd_reset_user ON password_reset_tokens (user_id);

-- ─── Email verification tokens ────────────────────────────────────────────────
CREATE TABLE email_verification_tokens (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash  VARCHAR(64) NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_verif_hash ON email_verification_tokens (token_hash);

-- ─── Login attempts (brute force protection) ──────────────────────────────────
CREATE TABLE login_attempts (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email        VARCHAR(255) NOT NULL,
  ip_address   INET        NOT NULL,
  succeeded    BOOLEAN     NOT NULL DEFAULT false,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_login_attempts_email_time ON login_attempts (email, attempted_at);
CREATE INDEX idx_login_attempts_ip         ON login_attempts (ip_address);
