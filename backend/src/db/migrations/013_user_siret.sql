-- ─── SIRET organisateur ──────────────────────────────────────────────────────
-- Numéro SIRET (14 chiffres) renseigné lors de l'inscription d'un organisateur,
-- pour attester d'une structure réelle. NULL pour les membres classiques.
ALTER TABLE users
  ADD COLUMN siret VARCHAR(14),
  ADD CONSTRAINT chk_users_siret CHECK (siret IS NULL OR siret ~ '^[0-9]{14}$');
