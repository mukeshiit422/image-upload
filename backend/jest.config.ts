import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/__tests__/**/*.test.ts'],
  testTimeout: 30000,
  clearMocks: true,
  moduleNameMapper: {
    '^../../config$': '<rootDir>/src/__tests__/helpers/config.mock.ts',
  },
};

export default config;
