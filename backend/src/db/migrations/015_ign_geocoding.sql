-- Le géocodage des établissements utilise désormais le service public
-- Géoplateforme de l'IGN. La colonne devient indépendante du fournisseur.
ALTER TABLE establishments
  RENAME COLUMN mapbox_id TO address_id;

COMMENT ON COLUMN establishments.address_id IS
  'Identifiant de l’adresse renvoyé par le service de géocodage utilisé';
