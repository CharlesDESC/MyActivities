-- ─── Refonte messagerie : modèle N-participants (direct + groupe) ────────────────
-- La table `conversations` passait par une paire figée (participant_a/b). On
-- généralise vers un modèle unifié : chaque conversation a un `type` et ses
-- membres sont portés par une table de jointure `conversation_participants`.
-- Les conversations 1-à-1 existantes sont migrées sans perte.
CREATE TYPE conversation_type AS ENUM ('direct', 'group');

ALTER TABLE conversations
  ADD COLUMN type       conversation_type NOT NULL DEFAULT 'direct',
  ADD COLUMN title      TEXT,
  ADD COLUMN created_by UUID REFERENCES users (id) ON DELETE SET NULL;

-- Membres d'une conversation. `role` : 'admin' (créateur d'un groupe) ou 'member'.
-- `last_read_at` porte le décompte des non-lus, unifié pour direct ET groupe.
CREATE TABLE conversation_participants (
  conversation_id UUID        NOT NULL REFERENCES conversations (id) ON DELETE CASCADE,
  user_id         UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  role            TEXT        NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_read_at    TIMESTAMPTZ,

  PRIMARY KEY (conversation_id, user_id)
);

CREATE INDEX idx_conv_participants_user ON conversation_participants (user_id);

-- Backfill : chaque direct existant devient 2 lignes de participants.
INSERT INTO conversation_participants (conversation_id, user_id, joined_at)
SELECT id, participant_a, created_at FROM conversations
UNION ALL
SELECT id, participant_b, created_at FROM conversations;

-- Les colonnes de paire figée ne servent plus (participation via la jointure).
ALTER TABLE conversations
  DROP CONSTRAINT IF EXISTS chk_conversation_order,
  DROP CONSTRAINT IF EXISTS uq_conversation_pair,
  DROP COLUMN participant_a,
  DROP COLUMN participant_b;

-- Aide au get-or-create d'un direct : retrouver rapidement les conversations
-- 'direct' auxquelles un utilisateur participe (intersection côté service).
CREATE INDEX idx_conversations_type ON conversations (type);
