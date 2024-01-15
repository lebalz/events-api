process.env.TZ = 'UTC';

var config = require('./jest.config')
config.testRegex = "\\.spec\\.ts$"

config.coverageDirectory = 'coverage.integration',
console.log('RUNNING INTEGRATION TESTS')

module.exports = config