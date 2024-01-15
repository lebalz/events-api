module.exports = {
    clearMocks: true,
    preset: 'ts-jest',
    testEnvironment: 'node',
    coverageReporters: ['json'],
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