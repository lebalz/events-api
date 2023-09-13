var config = require('./jest.config')
config.testRegex = "\\.spec\\.ts$"

config.coverageDirectory = 'coverage.integration',
// config.setupFiles = [
//   '<rootDir>/tests/config/jest.env.ts'
// ],
console.log('RUNNING INTEGRATION TESTS')

module.exports = config