CREATE TABLE reviews (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  activity_id UUID        NOT NULL REFERENCES activities (id) ON DELETE CASCADE,
  rating      SMALLINT    NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ,

  -- 1 note max par utilisateur par activité (BF-029)
  CONSTRAINT uq_reviews_user_activity UNIQUE (user_id, activity_id)
);

CREATE INDEX idx_reviews_activity ON reviews (activity_id);
CREATE INDEX idx_reviews_rating   ON reviews (rating);
