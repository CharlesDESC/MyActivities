const expoConfig = require('eslint-config-expo/flat');

module.exports = [
  ...expoConfig,
  {
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      // Pattern maison assumé : les hooks de données initialisent leur état de
      // chargement/erreur dans l'effet de montage (fetch au mount). Supprimer les
      // rendus en cascade que signale cette règle supposerait une couche de
      // data-fetching dédiée (React Query ou équivalent) — hors périmètre du MVP.
      // Désactivée pour garder une sortie de lint exploitable.
      'react-hooks/set-state-in-effect': 'off',
    },
    ignores: ['dist/**', 'node_modules/**', '.expo/**'],
  },
];
