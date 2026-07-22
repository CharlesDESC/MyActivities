-- ─── Establishments (fiches établissement organisateur) ─────────────────────────
-- Un compte organisateur possède au plus un établissement réutilisable. Une activité référence
-- un établissement, qui fournit l'adresse et la position — fini la ressaisie des
-- coordonnées à chaque activité.
-- `mapbox_id`, l'adresse et la position proviennent d'une requête Mapbox
-- Geocoding permanente (`permanent=true`), autorisant leur conservation.
CREATE TABLE establishments (
  id           UUID                   PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id UUID                   NOT NULL UNIQUE REFERENCES users (id) ON DELETE CASCADE,
  name         VARCHAR(100)           NOT NULL,
  address      VARCHAR(500)           NOT NULL,
  location     GEOGRAPHY(POINT, 4326) NOT NULL,
  mapbox_id    TEXT                   NOT NULL,
  phone        VARCHAR(30),
  website_url  TEXT,
  created_at   TIMESTAMPTZ            NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ            NOT NULL DEFAULT now()
);

CREATE INDEX idx_establishments_location_gist ON establishments USING GIST (location);

-- Rattachement activité → établissement. Nullable : les activités déjà en base
-- n'ont pas d'établissement ; leur adresse/position restent dénormalisées.
ALTER TABLE activities
  ADD COLUMN establishment_id UUID REFERENCES establishments (id) ON DELETE SET NULL;

CREATE INDEX idx_activities_establishment ON activities (establishment_id);
