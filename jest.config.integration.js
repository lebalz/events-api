import config from './jest.config.js';
process.env.TZ = 'UTC';

const integrationConfig = {
    ...config,
    testRegex: '\\.spec\\.ts$',
    coverageDirectory: 'coverage.integration'
};

console.log('RUNNING INTEGRATION TESTS');

export default integrationConfig;
