import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  // Exclus : point d'entrée et scripts CLI (migrate, seed) — exécutés à la main,
  // sans valeur ajoutée en test unitaire.
  collectCoverageFrom: ['src/**/*.ts', '!src/index.ts', '!src/db/migrate.ts', '!src/db/seed.ts'],
  coverageThreshold: {
    global: { statements: 90, branches: 80, functions: 90, lines: 90 },
  },
  setupFiles: ['<rootDir>/src/__tests__/setup.ts'],
  testTimeout: 15000,
};

export default config;
