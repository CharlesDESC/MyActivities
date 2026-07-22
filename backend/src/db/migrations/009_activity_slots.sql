-- ─── Créneaux de réservation ───────────────────────────────────────────────────
-- L'organisateur définit des créneaux avec une capacité ; les réservations
-- (planning_entries) s'y rattachent et ne peuvent pas dépasser la capacité.
CREATE TABLE activity_slots (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID        NOT NULL REFERENCES activities (id) ON DELETE CASCADE,
  starts_at   TIMESTAMPTZ NOT NULL,
  ends_at     TIMESTAMPTZ,
  capacity    INTEGER     NOT NULL CHECK (capacity > 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (activity_id, starts_at)
);

CREATE INDEX idx_slots_activity_date ON activity_slots (activity_id, starts_at);

-- Rattachement des réservations aux créneaux (NULL = entrée à date libre, historique)
ALTER TABLE planning_entries
  ADD COLUMN slot_id UUID REFERENCES activity_slots (id) ON DELETE CASCADE;

CREATE INDEX idx_planning_slot ON planning_entries (slot_id);

-- Un utilisateur ne peut réserver un même créneau qu'une seule fois
CREATE UNIQUE INDEX idx_planning_user_slot
  ON planning_entries (user_id, slot_id)
  WHERE slot_id IS NOT NULL;
