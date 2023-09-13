import request from 'supertest';
import { truncate } from "./helpers/db";
import prisma from '../../src/prisma';
import app, { API_URL } from '../../src/app';
import { generateUser } from '../factories/user';
import { Role } from '@prisma/client';

beforeAll(() => {
    return truncate();
});

afterAll(() => {
    return prisma.$disconnect();
});

describe(`GET ${API_URL}/user authorized`, () => {
    afterEach(() => {
        return truncate();
    });
    it('rejects unauthorized users', async () => {
        const result = await request(app)
            .get(`${API_URL}/user`)
            .set('authorization', JSON.stringify({ noAuth: true }));
        expect(result.statusCode).toEqual(401);
    });
    it('authenticates users', async () => {
        await prisma.user.create({
            data: generateUser({email: 'foo@bar.ch'})
        });
        const result = await request(app)
            .get(`${API_URL}/user`)
            .set('authorization', JSON.stringify({ email: 'foo@bar.ch' }));
        expect(result.statusCode).toEqual(200);
        expect(result.body).toEqual({
            id: expect.any(String),
            email: 'foo@bar.ch',
            role: Role.USER,
            firstName: expect.any(String),
            lastName: expect.any(String),
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
            icsLocator: null,
            untisId: null,
        });
    });
});