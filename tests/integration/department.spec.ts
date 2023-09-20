import request from 'supertest';
import app, { API_URL } from '../../src/app';
import prisma from '../../src/prisma';
import { generateUser } from '../factories/user';
import { generateImportJob, generateSyncJob, jobSequence } from '../factories/job';
import { generateSemester } from '../factories/semester';
import { truncate } from './helpers/db';
import { Department, EventState, Job } from '@prisma/client';
import { eventSequence } from '../factories/event';
import stubs from './stubs/departments.json';

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
    });
});

describe(`GET ${API_URL}/department/:id`, () => {
    it("prevents public user to get department", async () => {
        const dep = await prisma.department.findFirst();
        const result = await request(app)
            .get(`${API_URL}/department/${dep!.id}`);
        expect(result.statusCode).toEqual(401);
    });
    it("can get department by id", async () => {
        const user = await prisma.user.create({data: generateUser({})});
        const dep = await prisma.department.findFirst();
        const result = await request(app)
            .get(`${API_URL}/department/${dep!.id}`)
            .set('authorization', JSON.stringify({email: user.email}));
        expect(result.statusCode).toEqual(200);
        expect(result.body).toEqual(prepareDepartment(dep!));
    });
});
