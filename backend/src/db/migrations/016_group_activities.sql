-- Une proposition par activité et groupe, sans réservation des participants.
CREATE TABLE conversation_activities (
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  added_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, activity_id)
);
CREATE INDEX idx_conversation_activities_activity ON conversation_activities(activity_id);
