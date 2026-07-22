-- ─── Activities ────────────────────────────────────────────────────────────────
CREATE TABLE activities (
  id                     UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id           UUID              NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  name                   VARCHAR(100)      NOT NULL,
  category               activity_category NOT NULL,
  description            TEXT              NOT NULL,
  address                VARCHAR(500)      NOT NULL,
  location               GEOGRAPHY(POINT, 4326) NOT NULL,
  price_min              DECIMAL(8,2)      NOT NULL CHECK (price_min >= 0),
  price_max              DECIMAL(8,2)      NOT NULL CHECK (price_max >= price_min),
  opening_hours          JSONB,
  accessibility_pmr      BOOLEAN           NOT NULL DEFAULT false,
  accessibility_stroller BOOLEAN           NOT NULL DEFAULT false,
  website_url            TEXT,
  cover_image_url        TEXT,
  status                 activity_status   NOT NULL DEFAULT 'pending',
  views                  INTEGER           NOT NULL DEFAULT 0,
  avg_rating             DECIMAL(3,2),
  review_count           INTEGER           NOT NULL DEFAULT 0,
  search_tsv             TSVECTOR,
  admin_note             TEXT,
  created_at             TIMESTAMPTZ       NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ       NOT NULL DEFAULT now()
);

-- Index géolocalisation (PostGIS)
CREATE INDEX idx_activities_location_gist ON activities USING GIST (location);
-- Index recherche full-text
CREATE INDEX idx_activities_search_gin   ON activities USING GIN  (search_tsv);
-- Index filtres courants
CREATE INDEX idx_activities_organizer ON activities (organizer_id);
CREATE INDEX idx_activities_status    ON activities (status);
CREATE INDEX idx_activities_category  ON activities (category);
CREATE INDEX idx_activities_rating    ON activities (avg_rating);

-- Trigger mise à jour search_tsv
CREATE OR REPLACE FUNCTION trg_activities_search_tsv()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_tsv := to_tsvector(
    'french',
    NEW.name || ' ' || NEW.description || ' ' || NEW.category::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_search_tsv
BEFORE INSERT OR UPDATE ON activities
FOR EACH ROW EXECUTE FUNCTION trg_activities_search_tsv();

-- ─── Activity photos ───────────────────────────────────────────────────────────
CREATE TABLE activity_photos (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID        NOT NULL REFERENCES activities (id) ON DELETE CASCADE,
  url         TEXT        NOT NULL,
  position    SMALLINT    NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_activity_photos_order ON activity_photos (activity_id, position);
