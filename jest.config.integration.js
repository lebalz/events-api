var config = require('./jest.config')
config.testRegex = "\\.spec\\.ts$"
console.log('RUNNING INTEGRATION TESTS')

module.exports = config