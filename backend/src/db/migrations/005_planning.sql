CREATE TABLE planning_entries (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  activity_id             UUID        NOT NULL REFERENCES activities (id) ON DELETE CASCADE,
  scheduled_at            TIMESTAMPTZ NOT NULL,
  reminder_offset_minutes INTEGER,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_planning_user      ON planning_entries (user_id);
CREATE INDEX idx_planning_user_date ON planning_entries (user_id, scheduled_at);
CREATE INDEX idx_planning_activity  ON planning_entries (activity_id);
