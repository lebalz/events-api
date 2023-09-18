import request from 'supertest';
import { truncate } from "./helpers/db";
import prisma from '../../src/prisma';
import app, { API_URL } from '../../src/app';
import { generateUser } from '../factories/user';
import { Role, User } from '@prisma/client';
import { generateUntisTeacher } from '../factories/untisTeacher';

beforeAll(() => {
    return truncate();
});

afterAll(() => {
    return prisma.$disconnect();
});

const prepareUser = (user: User) => {
    return JSON.parse(JSON.stringify(user));
}

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
describe(`GET ${API_URL}/user/:id authorized`, () => {
    afterEach(() => {
        return truncate();
    });
    it('returns user', async () => {
        const user = await prisma.user.create({
            data: generateUser({email: 'foo@bar.ch'})
        });
        const result = await request(app)
            .get(`${API_URL}/user/${user.id}`)
            .set('authorization', JSON.stringify({email: user.email}));
        expect(result.statusCode).toEqual(200);
        expect(result.body).toEqual(prepareUser(user));
    });
    it('returns other user', async () => {
        const user = await prisma.user.create({
            data: generateUser({email: 'foo@bar.ch'})
        });
        const other = await prisma.user.create({
            data: generateUser({email: 'other@user.ch'})
        });
        const result = await request(app)
            .get(`${API_URL}/user/${other.id}`)
            .set('authorization', JSON.stringify({email: user.email}));
        expect(result.statusCode).toEqual(200);
        expect(result.body).toEqual(prepareUser(other));
    });
});

describe(`PUT ${API_URL}/user/:id/link_to_untis`, () => {
    afterEach(() => {
        return truncate();
    });
    it('can link self to an untis teacher', async () => {
        const user = await prisma.user.create({
            data: generateUser({email: 'foo@bar.ch'})
        });
        const untisUser = await prisma.untisTeacher.create({
            data: generateUntisTeacher({id: 1234})
        });
        const result = await request(app)
            .put(`${API_URL}/user/${user.id}/link_to_untis`)
            .set('authorization', JSON.stringify({email: user.email}))
            .send({ data: { untisId: untisUser.id } });
        expect(result.statusCode).toEqual(200);
        expect(result.body).toEqual({
            ...prepareUser(user),
            untisId: untisUser.id,
            updatedAt: expect.any(String)
        });
    });
    it('can not link to a used untis teacher', async () => {
        const untisUser = await prisma.untisTeacher.create({
            data: generateUntisTeacher({id: 1234})
        });
        const reto = await prisma.user.create({
            data: generateUser({email: 'reto@bar.ch', untisId: untisUser.id})
        });
        const user = await prisma.user.create({
            data: generateUser({email: 'foo@bar.ch'})
        });
        const result = await request(app)
            .put(`${API_URL}/user/${user.id}/link_to_untis`)
            .set('authorization', JSON.stringify({email: user.email}))
            .send({ data: { untisId: untisUser.id } });
        expect(result.statusCode).toEqual(400);
    });
    it('can not link to other users', async () => {
        const reto = await prisma.user.create({
            data: generateUser({email: 'reto@bar.ch'})
        });
        const user = await prisma.user.create({
            data: generateUser({email: 'foo@bar.ch'})
        });
        const untisUser = await prisma.untisTeacher.create({
            data: generateUntisTeacher({id: 1234})
        });

        const result = await request(app)
            .put(`${API_URL}/user/${user.id}/link_to_untis`)
            .set('authorization', JSON.stringify({email: reto.email}))
            .send({ data: { untisId: untisUser.id } });
        expect(result.statusCode).toEqual(403);
    });
    it('can link other users when admin role', async () => {
        const admin = await prisma.user.create({
            data: generateUser({email: 'admin@bar.ch', role: Role.ADMIN})
        });
        const user = await prisma.user.create({
            data: generateUser({email: 'foo@bar.ch'})
        });
        const untisUser = await prisma.untisTeacher.create({
            data: generateUntisTeacher({id: 1234})
        });

        const result = await request(app)
            .put(`${API_URL}/user/${user.id}/link_to_untis`)
            .set('authorization', JSON.stringify({email: admin.email}))
            .send({ data: { untisId: untisUser.id } });
        expect(result.statusCode).toEqual(200);
        expect(result.body).toEqual({
            ...prepareUser(user),
            untisId: untisUser.id,
            updatedAt: expect.any(String)
        });
    });
});