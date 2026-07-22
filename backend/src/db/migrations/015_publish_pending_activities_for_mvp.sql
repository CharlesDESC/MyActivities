-- Contournement temporaire du workflow de modération tant que l'interface
-- d'administration n'est pas disponible. Les prochaines créations sont
-- pilotées par ACTIVITY_MODERATION_ENABLED dans la configuration du serveur.
UPDATE activities
SET status = 'published',
    admin_note = NULL,
    updated_at = NOW()
WHERE status = 'pending';
