-- ─── Messagerie utilisateur (extension hors périmètre MVP initial) ─────────────
-- Conversation 1-à-1 entre deux utilisateurs. La paire est stockée de façon
-- canonique (participant_a < participant_b) pour garantir *une seule*
-- conversation par couple, quel que soit l'ordre d'ouverture.
CREATE TABLE conversations (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_a   UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  participant_b   UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Paire canonique : interdit self-conversation et doublons (a,b)/(b,a)
  CONSTRAINT chk_conversation_order CHECK (participant_a < participant_b),
  CONSTRAINT uq_conversation_pair   UNIQUE (participant_a, participant_b)
);

CREATE INDEX idx_conversations_a    ON conversations (participant_a);
CREATE INDEX idx_conversations_b    ON conversations (participant_b);
CREATE INDEX idx_conversations_last ON conversations (last_message_at DESC);

CREATE TABLE messages (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID        NOT NULL REFERENCES conversations (id) ON DELETE CASCADE,
  sender_id       UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  content         TEXT        NOT NULL,
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_conversation ON messages (conversation_id, created_at);
-- Index partiel : accélère le décompte des messages non lus (badge de conversation)
CREATE INDEX idx_messages_unread ON messages (conversation_id) WHERE read_at IS NULL;
