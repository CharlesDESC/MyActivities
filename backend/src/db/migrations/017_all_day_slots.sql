ALTER TABLE activity_slots ADD COLUMN all_day BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE activity_slots ADD CONSTRAINT all_day_slot_end CHECK (NOT all_day OR (ends_at IS NOT NULL AND ends_at > starts_at));
