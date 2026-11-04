import type { Config } from 'jest';
import dotenv from 'dotenv';
import path from 'path';

// Load test env vars before any test runs (CI overrides these via real env vars)
dotenv.config({ path: path.join(__dirname, '.env.test'), override: false });

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/__tests__/**/*.test.ts'],
  testTimeout: 30000,
  clearMocks: true,
  // Run test files sequentially — integration/regression/security share a real PostgreSQL DB
  maxWorkers: 1,
  moduleNameMapper: {
    '^.+/config$': '<rootDir>/src/__tests__/helpers/config.mock.ts',
    '^.+/utils/logger$': '<rootDir>/src/__tests__/helpers/logger.mock.ts',
  },
};

export default config;
