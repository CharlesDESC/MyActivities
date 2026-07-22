const expoConfig = require('eslint-config-expo/flat');

module.exports = [
  ...expoConfig,
  {
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      // Pattern maison assumé : les hooks de données initialisent leur état de
      // chargement/erreur dans l'effet de montage (fetch au mount). La règle reste
      // active en avertissement pour la visibilité, sans bloquer la CI.
      'react-hooks/set-state-in-effect': 'warn',
    },
    ignores: ['dist/**', 'node_modules/**', '.expo/**'],
  },
];
