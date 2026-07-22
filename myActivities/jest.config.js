/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    // Doit précéder la règle '^@/(.*)$' : les imports CSS sont stubbés (Jest ne parse pas le CSS).
    '\\.css$': '<rootDir>/jest/style-mock.js',
    '^@/assets/(.*)$': '<rootDir>/assets/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
    // npm imbrique expo-modules-core sous expo/ : jest-expo ne le résout pas
    // depuis son propre dossier. On le pointe explicitement (test uniquement,
    // l'arbre de dépendances de l'app n'est pas modifié).
    '^expo-modules-core$': '<rootDir>/node_modules/expo/node_modules/expo-modules-core',
    '^expo-modules-core/(.*)$': '<rootDir>/node_modules/expo/node_modules/expo-modules-core/$1',
  },
  // Les paquets Expo / React Native sont publiés en ESM non transpilé : Babel doit les traiter.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|@rnmapbox/.*))',
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    // Exclus : feuilles de style, déclarations de types et écrans purement compositionnels
    '!src/**/*.d.ts',
    '!src/styles/**',
    '!src/types/**',
    '!src/app/**',
    // Exclus : variantes web (non exécutées dans l'env de test React Native)
    '!src/**/*.web.ts',
    '!src/**/*.web.tsx',
    // Exclus : code lié au natif / animations — relève des tests manuels ou E2E,
    // pas du test unitaire Node (même logique que l'exclusion des scripts CLI côté backend) :
    '!src/lib/map/**',            // SDK Mapbox natif + repli/variantes
    '!src/components/splash/**',  // animation react-native-reanimated (worklets)
    '!src/components/navigation/**', // tab bars natives
    '!src/components/web/**',     // composants spécifiques au web
  ],
  coverageThreshold: {
    global: { statements: 80, branches: 75, functions: 80, lines: 80 },
  },
};
