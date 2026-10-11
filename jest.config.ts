import type { Config } from 'jest';

const config: Config = {
  preset: 'jest-expo',
  maxWorkers: 3,
  modulePathIgnorePatterns: ['crons'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  transform: {
    // ts-jest type-checks, so it only gets this project's own TypeScript.
    // Expo packages ship TypeScript source in node_modules, which must fall
    // through to the Babel transform of the jest-expo preset.
    '^(?!.*/node_modules/).+\\.tsx?$': 'ts-jest',
    '^.+\\.jsx?$': 'babel-jest',
  },
};

export default config;
