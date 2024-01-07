var config = require('./jest.config')
config.testRegex = "\\.test\\.ts$" //Overriding testRegex option
config.setupFilesAfterEnv = [
  '<rootDir>/tests/unit/__mocks__/db-cleaner.ts'
],
config.coverageDirectory = 'coverage.unit',
console.log('RUNNING UNIT TESTS')

module.exports = config