import type { Config } from 'jest';

// Unit tests: *.spec.ts files co-located with the code under src/.
const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!main.ts',
    '!**/*.spec.ts',
    '!**/interfaces/**',
    // Exercised through the TypeORM CLI, not unit tests.
    '!database/data-source.ts',
    '!database/migrations/**',
  ],
  coverageDirectory: '../coverage',
  // Course quality gate: at least 80% coverage on code (SENG 34213 §6.4).
  coverageThreshold: {
    global: { branches: 80, functions: 80, lines: 80, statements: 80 },
  },
  testEnvironment: 'node',
};

export default config;
