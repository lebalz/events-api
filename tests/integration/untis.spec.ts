import request from 'supertest';
import app, { API_URL } from '../../src/app';
import prisma from '../../src/prisma';
import { generateUser } from '../factories/user';
import { truncate } from './helpers/db';
import { Department, Role, UntisLesson, UntisTeacher } from '@prisma/client';
import stubs from './stubs/semesters.json';
import _ from 'lodash';
import { notify } from '../../src/middlewares/notify.nop';
import { IoEvent } from '../../src/routes/socketEventTypes';
import { syncUntis2DB } from '../../src/services/syncUntis2DB';
import { UntisSubject } from '../../src/models/untisLessons';

/** checkout ../../src/services/__mocks__/fetchUntis.stub.json 
 * to see the stubs for the fetchUntis service
 * 
 */

jest.mock('../../src/services/fetchUntis');
jest.mock('../../src/middlewares/notify.nop');
const mNotification = <jest.Mock<typeof notify>>notify;

beforeEach(async () => {
    await prisma.semester.createMany({
        data: stubs.map((e: any) => ({
            id: e.id,
            name: e.name,
            start: e.start,
            end: e.end,
            untisSyncDate: e.untisSyncDate
        }))
    });
    const semester = await prisma.semester.findFirst({ where: { name: 'HS2023' } });
    await syncUntis2DB(semester!.id);
});

afterEach(() => {
    return truncate();
});

describe(`GET ${API_URL}/untis/teacher/all`, () => {
    it("prevents public user to fetch untis teachers", async () => {
        const result = await request(app)
            .get(`${API_URL}/untis/teacher/all`);
        expect(result.statusCode).toEqual(401);
    });
    it("returns all teachers for user", async () => {
        const user = await prisma.user.create({ data: generateUser({}) });
        const teachers = await prisma.untisTeacher.findMany();
        expect(teachers.length).toEqual(2);
        const result = await request(app)
            .get(`${API_URL}/untis/teacher/all`)
            .set('authorization', JSON.stringify({ email: user.email }))
        expect(result.statusCode).toEqual(200);
        expect(result.body.length).toEqual(2);
        expect(result.body.map((d: UntisTeacher) => d.id).sort()).toEqual(teachers.map(d => d.id).sort());
        expect(result.body[0]).not.toHaveProperty('lessons');
        expect(result.body[1]).not.toHaveProperty('lessons');
        expect(mNotification).toHaveBeenCalledTimes(0);
    });
});

describe(`GET ${API_URL}/untis/teacher/:id`, () => {
    it("prevents public user to fetch untis teachers", async () => {
        const result = await request(app)
            .get(`${API_URL}/untis/teacher/all/1`);
        expect(result.statusCode).toEqual(401);
    });
    it("returns teacher and it's lessons", async () => {
        const user = await prisma.user.create({ data: generateUser({}) });
        const teachers = await prisma.untisTeacher.findMany();
        expect(teachers.length).toEqual(2);
        const result = await request(app)
            .get(`${API_URL}/untis/teacher/${teachers[0].id}`)
            .set('authorization', JSON.stringify({ email: user.email }))
        expect(result.statusCode).toEqual(200);
        expect(result.body).toEqual({
            ...teachers[0],
            lessons: expect.arrayContaining([
                {
                    classes: [
                        {
                            id: 1,
                        },
                    ],
                    description: "Mathematik",
                    endHHMM: 1540,
                    id: 999,
                    room: "D207",
                    semesterId: expect.any(String),
                    semesterNr: 2,
                    startHHMM: 1455,
                    subject: "M",
                    teachers: [
                        {
                            id: 1,
                        },
                    ],
                    weekDay: 2,
                    year: 2023,
                },
                {
                    classes: [
                        {
                            id: 1,
                        },
                    ],
                    description: "Informatik",
                    endHHMM: 1635,
                    id: 1001,
                    room: "D207",
                    semesterId: expect.any(String),
                    semesterNr: 2,
                    startHHMM: 1550,
                    subject: "IN",
                    teachers: [
                        {
                            id: 1,
                        },
                    ],
                    weekDay: 2,
                    year: 2023,
                },
            ])
        });
        expect(mNotification).toHaveBeenCalledTimes(0);
    });
});

describe(`GET ${API_URL}/untis/class/all`, () => {
    it("prevents public user to fetch untis classes", async () => {
        const result = await request(app)
            .get(`${API_URL}/untis/class/all`);
        expect(result.statusCode).toEqual(401);
    });
    it("returns all classes for user", async () => {
        const user = await prisma.user.create({ data: generateUser({}) });
        const klasses = await prisma.untisClass.findMany();
        expect(klasses.length).toEqual(2);
        const result = await request(app)
            .get(`${API_URL}/untis/class/all`)
            .set('authorization', JSON.stringify({ email: user.email }))
        expect(result.statusCode).toEqual(200);
        expect(result.body.length).toEqual(2);
        expect(result.body.map((d: UntisTeacher) => d.id).sort()).toEqual(klasses.map(d => d.id).sort());
        expect(mNotification).toHaveBeenCalledTimes(0);
    });
});

describe(`GET ${API_URL}/untis/subjects/all`, () => {
    it("prevents public user to fetch untis subjects", async () => {
        const result = await request(app)
            .get(`${API_URL}/untis/subjects/all`);
        expect(result.statusCode).toEqual(401);
    });
    it("returns all subjects for user", async () => {
        const user = await prisma.user.create({ data: generateUser({}) });
        const lessons = await prisma.untisLesson.findMany();
        expect(lessons.length).toEqual(3);
        const result = await request(app)
            .get(`${API_URL}/untis/subjects`)
            .set('authorization', JSON.stringify({ email: user.email }))
        expect(result.statusCode).toEqual(200);
        expect(result.body.length).toEqual(2);
        expect(result.body.map((d: UntisSubject) => d.name).sort()).toEqual([...new Set(lessons.map(d => d.subject))].sort());
        expect(mNotification).toHaveBeenCalledTimes(0);
    });
});