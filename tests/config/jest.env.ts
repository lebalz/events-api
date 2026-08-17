import { jest } from '@jest/globals';
import * as dotenv from 'dotenv';
import { fetchUntis as mockFetchUntis } from '../../src/services/__mocks__/fetchUntis.js';

await jest.unstable_mockModule('../../src/services/fetchUntis.js', () => ({
    fetchUntis: mockFetchUntis
}));

await jest.unstable_mockModule('../../src/middlewares/notify.nop.js', () => ({
    notify: jest.fn()
}));

await jest.unstable_mockModule('../../src/socketIoServer.js', () => ({
    notifyChangedRecord: jest.fn(),
    notify: jest.fn(),
    getIo: jest.fn(),
    initialize: jest.fn()
}));

const env = dotenv.config();
console.log('Loaded environment variables from .test.env:', process.env.DATABASE_URL);
