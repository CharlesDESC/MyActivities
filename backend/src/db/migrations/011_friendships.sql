-- ─── Système d'amis ────────────────────────────────────────────────────────────
-- Relation d'amitié orientée par la demande (requester → addressee) mais
-- symétrique une fois acceptée. L'unicité est *non-orientée* : une seule ligne
-- par paire d'utilisateurs, quel que soit qui a envoyé la demande.
CREATE TYPE friendship_status AS ENUM ('pending', 'accepted');

CREATE TABLE friendships (
  id            UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id  UUID              NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  addressee_id  UUID              NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  status        friendship_status NOT NULL DEFAULT 'pending',
  created_at    TIMESTAMPTZ       NOT NULL DEFAULT now(),
  responded_at  TIMESTAMPTZ,

  -- Interdit une demande à soi-même
  CONSTRAINT chk_friendship_distinct CHECK (requester_id <> addressee_id)
);

-- Unicité non-orientée : (a,b) et (b,a) sont la même relation → une seule ligne.
CREATE UNIQUE INDEX uq_friendship_pair
  ON friendships (LEAST(requester_id, addressee_id), GREATEST(requester_id, addressee_id));

CREATE INDEX idx_friendships_addressee ON friendships (addressee_id) WHERE status = 'pending';
CREATE INDEX idx_friendships_requester ON friendships (requester_id);
