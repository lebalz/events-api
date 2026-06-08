/** @type {import('jest').Config} */
const config = {
  clearMocks: true,
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  testEnvironment: 'node',
  coverageReporters: ['json'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: true,
      tsconfig: './tsconfig.json',
    }],
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^src/(.*)\\.js$': '<rootDir>/src/$1',
    '^prisma/(.*)\\.js$': '<rootDir>/prisma/$1',
  },
  setupFiles: [
    '<rootDir>/tests/config/jest.env.ts'
  ],
  setupFilesAfterEnv: [
    '<rootDir>/tests/config/db-cleaner.ts'
  ],
  testRegex: "\\.(spec|test)\\.ts$",
  coveragePathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/tests/',
    '.query.ts',
  ],
  maxWorkers: 1,
}

export default config;