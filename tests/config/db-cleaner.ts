import { Console } from 'console';
import prisma from '../../src/prisma';
import { truncate } from '../helpers/db';

afterEach(async () => {
    await truncate(true);
});

afterAll(async () => {
    prisma.$disconnect();
});
