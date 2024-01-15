var config = require('./jest.config')
config.testRegex = "\\.test\\.ts$" //Overriding testRegex option
config.coverageDirectory = 'coverage.unit';
console.log('RUNNING UNIT TESTS')

module.exports = config