var config = require('./jest.config')
config.testRegex = "\\.test\\.ts$" //Overriding testRegex option
config.setupFilesAfterEnv = [
  '<rootDir>/tests/unit_tests/__mocks__/prismockConfig.ts',
  '<rootDir>/tests/unit_tests/__mocks__/prismockCleaner.ts'
],
console.log('RUNNING UNIT TESTS')

module.exports = config