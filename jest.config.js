module.exports = {
    clearMocks: true,
    preset: 'ts-jest',
    testEnvironment: 'node',
    coverageReporters: ['json'],
    coveragePathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/tests/'],
    maxWorkers: 1,
  }