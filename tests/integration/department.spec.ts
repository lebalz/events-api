import request from 'supertest';
import app, { API_URL } from '../../src/app';
import prisma from '../../src/prisma';
import { generateUser } from '../factories/user';
import { generateImportJob, generateSyncJob, jobSequence } from '../factories/job';
import { generateSemester } from '../factories/semester';
import { truncate } from './helpers/db';
import { Department, EventState, Job, Role } from '@prisma/client';
import { eventSequence } from '../factories/event';
import stubs from './stubs/departments.json';
import _ from 'lodash';
import { notify } from '../../src/middlewares/notify.nop';
import { IoEvent } from '../../src/routes/socketEventTypes';

jest.mock('../../src/middlewares/notify.nop');
const mNotification = <jest.Mock<typeof notify>>notify;

const prepareDepartment = (department: Department) => {
    return {
        ...JSON.parse(JSON.stringify(department))
    }
}

beforeEach(async () => {
    await prisma.department.createMany({
        data: stubs.map((e: any) => ({
            id: e.id,
            name: e.name,
            description: e.description,
            color: e.color,
            letter: e.letter,
            classLetters: e.classLetters
        }))
    });
});

afterEach(() => {
    return truncate();
});

describe(`GET ${API_URL}/department/all`, () => {
    it("returns all departments for public user", async () => {
        const deps = await prisma.department.findMany();
        const result = await request(app)
            .get(`${API_URL}/department/all`);
        expect(result.statusCode).toEqual(200);
        expect(result.body.length).toEqual(13);
        expect(result.body.map((d: Department) => d.id).sort()).toEqual(deps.map(d => d.id).sort());
        expect(mNotification).toHaveBeenCalledTimes(0);
    });
});

describe(`GET ${API_URL}/department/:id`, () => {
    it("prevents public user to get department", async () => {
        const dep = await prisma.department.findFirst();
        const result = await request(app)
            .get(`${API_URL}/department/${dep!.id}`);
        expect(result.statusCode).toEqual(401);
        expect(mNotification).toHaveBeenCalledTimes(0);
    });
    it("can get department by id", async () => {
        const user = await prisma.user.create({data: generateUser({})});
        const dep = await prisma.department.findFirst();
        const result = await request(app)
            .get(`${API_URL}/department/${dep!.id}`)
            .set('authorization', JSON.stringify({email: user.email}));
        expect(result.statusCode).toEqual(200);
        expect(result.body).toEqual(prepareDepartment(dep!));
        expect(mNotification).toHaveBeenCalledTimes(0);
    });
});
describe(`PUT ${API_URL}/department/:id`, () => {
    it("prevents user to update departments", async () => {
        const user = await prisma.user.create({data: generateUser({})});
        const dep = await prisma.department.findFirst();
        const result = await request(app)
            .put(`${API_URL}/department/${dep!.id}`)
            .set('authorization', JSON.stringify({email: user.email}))
            .send({data: {name: 'FOO'}});
        expect(result.statusCode).toEqual(403);
        expect(mNotification).toHaveBeenCalledTimes(0);
    });
    it("admin can update departments", async () => {
        const admin = await prisma.user.create({data: generateUser({role: Role.ADMIN})});
        const dep = await prisma.department.findFirst();
        const result = await request(app)
            .put(`${API_URL}/department/${dep!.id}`)
            .set('authorization', JSON.stringify({email: admin.email}))
            .send({data: {name: 'FOO'}});
        expect(result.statusCode).toEqual(200);
        expect(result.body).toEqual({
            ...prepareDepartment(dep!),
            name: 'FOO',
            updatedAt: expect.any(String)
        });
        expect(mNotification).toHaveBeenCalledTimes(1);
        expect(mNotification.mock.calls[0][0]).toEqual({
            event: IoEvent.CHANGED_RECORD,
            message: { record: 'DEPARTMENT', id: dep!.id },
            to: 'all'
        });
    });
    it("can not update department with common letter to have overlapping classLetters", async () => {
        /**
         * GHIJ -> Letter G, classLetters[a-s]
         * GHIJ/GFED -> Letter G, classLetters[wxy]  --> can not be updated to [awxy], because of overlapping classLetters
         */
        const admin = await prisma.user.create({data: generateUser({role: Role.ADMIN})});
        const bili = await prisma.department.findUnique({where: {name: 'GHIJ/GFED'}});
        const deu = await prisma.department.findUnique({where: {name: 'GHIJ'}});
        expect(deu?.letter).toEqual(bili!.letter);
        expect(_.intersection(bili!.classLetters, deu!.classLetters)).toHaveLength(0);
        expect(deu?.classLetters).toEqual(expect.arrayContaining(['a']));

        const result = await request(app)
            .put(`${API_URL}/department/${bili!.id}`)
            .set('authorization', JSON.stringify({email: admin.email}))
            .send({data: {classLetters: ['a', ...bili!.classLetters]}});
        expect(result.statusCode).toEqual(400);
        expect(mNotification).toHaveBeenCalledTimes(0);
    });
    it("can update department with distinct letter to have overlapping classLetters", async () => {
        /**
         * GHIJ -> Letter G, classLetters[a-s]
         * GFED -> Letter m, classLetters[A-S]  --> can be updated to [a-s], because letter is distinct
         */
        const admin = await prisma.user.create({data: generateUser({role: Role.ADMIN})});
        const deu = await prisma.department.findUnique({where: {name: 'GHIJ'}});
        const fra = await prisma.department.findUnique({where: {name: 'GFED'}});
        expect(deu?.letter).not.toEqual(fra!.letter);

        const result = await request(app)
            .put(`${API_URL}/department/${fra!.id}`)
            .set('authorization', JSON.stringify({email: admin.email}))
            .send({data: {classLetters: deu!.classLetters}});
        expect(result.statusCode).toEqual(200);
        expect(result.body).toEqual({
            ...prepareDepartment(fra!),
            classLetters: deu!.classLetters,
            updatedAt: expect.any(String)
        });
        expect(mNotification).toHaveBeenCalledTimes(1);
        expect(mNotification.mock.calls[0][0]).toEqual({
            event: IoEvent.CHANGED_RECORD,
            message: { record: 'DEPARTMENT', id: fra!.id },
            to: 'all'
        });
    });
});


describe(`POST ${API_URL}/department`, () => {
    it("prevents user to create a department", async () => {
        const user = await prisma.user.create({data: generateUser({})});
        const result = await request(app)
            .post(`${API_URL}/department`)
            .set('authorization', JSON.stringify({email: user.email}))
            .send({name: 'FOO', description: 'BAR'});
        expect(result.statusCode).toEqual(403);
        expect(mNotification).toHaveBeenCalledTimes(0);
    });
    it("admin can create a new department", async () => {
        const admin = await prisma.user.create({data: generateUser({role: Role.ADMIN})});
        const dep = await prisma.department.findFirst();
        const result = await request(app)
            .post(`${API_URL}/department`)
            .set('authorization', JSON.stringify({email: admin.email}))
            .send({name: 'FOO', description: 'BAR'});
        expect(result.statusCode).toEqual(201);
        expect(result.body.name).toEqual('FOO');
        expect(result.body.description).toEqual('BAR');
        expect(mNotification).toHaveBeenCalledTimes(1);
        expect(mNotification.mock.calls[0][0]).toEqual({
            event: IoEvent.NEW_RECORD,
            message: { record: 'DEPARTMENT', id: result.body.id },
            to: 'all'
        });
    });
});


describe(`DELETE ${API_URL}/department/:id`, () => {
    it("prevents user to delete a department", async () => {
        const dep = await prisma.department.findFirst();
        const user = await prisma.user.create({data: generateUser({})});
        const result = await request(app)
            .delete(`${API_URL}/department/${dep!.id}`)
            .set('authorization', JSON.stringify({email: user.email}));
        expect(result.statusCode).toEqual(403);
        expect(mNotification).toHaveBeenCalledTimes(0);
    });
    it("admin can delete a department", async () => {
        const admin = await prisma.user.create({data: generateUser({role: Role.ADMIN})});
        const deps = await prisma.department.findMany();
        expect(deps).toHaveLength(13);
        const dep = deps[0];
        const result = await request(app)
            .delete(`${API_URL}/department/${dep!.id}`)
            .set('authorization', JSON.stringify({email: admin.email}));
        expect(result.statusCode).toEqual(204);
        const depsAfter = await prisma.department.findMany();
        expect(depsAfter).toHaveLength(12);
        expect(depsAfter.map(d => d.id)).not.toContain(dep!.id);
        expect(mNotification).toHaveBeenCalledTimes(1);
        expect(mNotification.mock.calls[0][0]).toEqual({
            event: IoEvent.DELETED_RECORD,
            message: { record: 'DEPARTMENT', id: dep!.id },
            to: 'all'
        });
    });
});