import { Console } from 'console';
import { jest } from '@jest/globals';
import prisma from 'src/prisma.js';
import { truncate } from '../helpers/db.js';

beforeEach(() => {
    jest.clearAllMocks();
});

afterEach(async () => {
    await truncate(true);
});

afterAll(async () => {
    prisma.$disconnect();
});
