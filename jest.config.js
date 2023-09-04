module.exports = {
    clearMocks: true,
    preset: 'ts-jest',
    testEnvironment: 'node',
    setupFilesAfterEnv: [
      '<rootDir>/__mocks__/prismockConfig.ts',
      '<rootDir>/__mocks__/prismockCleaner.ts'
    ],
    maxWorkers: 1,
  }