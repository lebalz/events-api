module.exports = {
    clearMocks: true,
    preset: 'ts-jest',
    testEnvironment: 'node',
    setupFilesAfterEnv: [
      '<rootDir>/tests/unit_tests/__mocks__/prismockConfig.ts',
      '<rootDir>/tests/unit_tests/__mocks__/prismockCleaner.ts'
    ],
    maxWorkers: 1,
  }