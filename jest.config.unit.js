import config from './jest.config.js';

const unitConfig = {
    ...config,
    testRegex: '\\.test\\.ts$',
    coverageDirectory: 'coverage.unit'
};

console.log('RUNNING UNIT TESTS');

export default unitConfig;
