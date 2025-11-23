import request from 'supertest';
import app, { API_URL } from '../../src/app';
import prisma from '../../src/prisma';
import { generateUser } from '../factories/user';
import { UntisTeacher } from '@prisma/client';
import stubs from './stubs/semesters.json';
import _ from 'lodash';
import { notify } from '../../src/middlewares/notify.nop';
import { syncUntis2DB } from '../../src/services/syncUntis2DB';
import { UntisSubject } from '../../src/models/untisLesson';

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

describe(`GET ${API_URL}/untis/teachers`, () => {
    it('prevents public user to fetch untis teachers', async () => {
        const result = await request(app).get(`${API_URL}/untis/teachers`);
        expect(result.statusCode).toEqual(401);
    });
    it('returns all teachers for user', async () => {
        const user = await prisma.user.create({ data: generateUser({}) });
        const teachers = await prisma.untisTeacher.findMany();
        expect(teachers.length).toEqual(5);
        const result = await request(app)
            .get(`${API_URL}/untis/teachers`)
            .set('authorization', JSON.stringify({ email: user.email }));
        expect(result.statusCode).toEqual(200);
        expect(result.body.length).toEqual(5);
        expect(result.body.map((d: UntisTeacher) => d.id).sort()).toEqual(teachers.map((d) => d.id).sort());
        expect(result.body[0]).not.toHaveProperty('lessons');
        expect(result.body[1]).not.toHaveProperty('lessons');
        expect(mNotification).toHaveBeenCalledTimes(0);
    });
});

describe(`GET ${API_URL}/untis/teachers/:id`, () => {
    it('prevents public user to fetch untis teachers', async () => {
        const result = await request(app).get(`${API_URL}/untis/teachers/1`);
        expect(result.statusCode).toEqual(401);
    });
    it("returns teacher and it's lessons", async () => {
        const user = await prisma.user.create({ data: generateUser({}) });
        const teachers = await prisma.untisTeacher.findMany();
        expect(teachers.length).toEqual(5);
        const result = await request(app)
            .get(`${API_URL}/untis/teachers/${teachers[0].id}`)
            .set('authorization', JSON.stringify({ email: user.email }));
        expect(result.statusCode).toEqual(200);
        expect(result.body).toEqual({
            ...teachers[0],
            hasUser: false,
            lessons: expect.any(Array)
        });
        expect(_.orderBy(result.body.lessons, ['id'], 'asc')).toEqual([
            {
                classIds: [1],
                description: 'Mathematik',
                endHHMM: 1540,
                id: 999,
                room: 'D207',
                semesterId: expect.any(String),
                semesterNr: 1,
                startHHMM: 1455,
                subject: 'M',
                teacherIds: [1],
                weekDay: 2,
                year: 2023
            },
            {
                classIds: [1],
                description: 'Informatik',
                endHHMM: 1635,
                id: 1001,
                room: 'D207',
                semesterId: expect.any(String),
                semesterNr: 1,
                startHHMM: 1550,
                subject: 'IN',
                teacherIds: [1],
                weekDay: 2,
                year: 2023
            }
        ]);
        expect(mNotification).toHaveBeenCalledTimes(0);
    });
});

describe(`GET ${API_URL}/untis/classes`, () => {
    it('allows public user to fetch untis classes (without relations)', async () => {
        const klasses = await prisma.untisClass.findMany({ include: { lessons: true, teachers: true } });
        expect(klasses.length).toEqual(5);
        expect(klasses.map((k) => k.lessons).flat().length).toEqual(6);
        expect(klasses.map((k) => k.teachers).flat().length).toEqual(5);
        const result = await request(app).get(`${API_URL}/untis/classes`);
        expect(result.statusCode).toEqual(200);

        expect(result.body.map((d: UntisTeacher) => d.id).sort()).toEqual(klasses.map((d) => d.id).sort());
        expect(result.body.map((k: { lessonIds: string[] }) => k.lessonIds).flat().length).toEqual(0);
        expect(result.body.map((k: { teacherIds: string[] }) => k.teacherIds).flat().length).toEqual(0);
        expect(mNotification).toHaveBeenCalledTimes(0);
    });
    it('returns all classes for user', async () => {
        const user = await prisma.user.create({ data: generateUser({}) });
        const klasses = await prisma.untisClass.findMany();
        expect(klasses.length).toEqual(5);
        const result = await request(app)
            .get(`${API_URL}/untis/classes`)
            .set('authorization', JSON.stringify({ email: user.email }));
        expect(result.statusCode).toEqual(200);
        expect(result.body.length).toEqual(5);
        expect(result.body.map((d: UntisTeacher) => d.id).sort()).toEqual(klasses.map((d) => d.id).sort());
        expect(mNotification).toHaveBeenCalledTimes(0);
    });
});

describe(`GET ${API_URL}/untis/subjects`, () => {
    it('prevents public user to fetch untis subjects', async () => {
        const result = await request(app).get(`${API_URL}/untis/subjects`);
        expect(result.statusCode).toEqual(401);
    });
    it('returns all subjects for user', async () => {
        const user = await prisma.user.create({ data: generateUser({}) });
        const lessons = await prisma.untisLesson.findMany();
        expect(lessons.length).toEqual(6);
        const result = await request(app)
            .get(`${API_URL}/untis/subjects`)
            .set('authorization', JSON.stringify({ email: user.email }));
        expect(result.statusCode).toEqual(200);
        expect(result.body.length).toEqual(4);
        expect(result.body.map((d: UntisSubject) => d.name).sort()).toEqual(
            [...new Set(lessons.map((d) => d.subject))].sort()
        );
        expect(mNotification).toHaveBeenCalledTimes(0);
    });
});

describe(`GET ${API_URL}/untis/teachers_subjects`, () => {
    it('prevents public user to fetch teachers subjects', async () => {
        const result = await request(app).get(`${API_URL}/untis/teachers_subjects`);
        expect(result.statusCode).toEqual(401);
    });
    it('returns all teachers subjects for a given semester', async () => {
        const user = await prisma.user.create({ data: generateUser({}) });
        const abc = await prisma.untisTeacher.findFirstOrThrow({ where: { name: 'abc' } });
        const ambrosio = await prisma.user.create({ data: generateUser({ untisId: abc.id }) });
        const lessons = await prisma.untisLesson.findMany({ include: { classes: true, teachers: true } });
        const semester = await prisma.semester.findFirst({ where: { name: 'HS2023' } });

        expect(lessons.length).toEqual(6);
        expect(lessons.filter((l) => l.teachers.some((t) => t.id === abc.id)).length).toEqual(2);
        const result = await request(app)
            .get(`${API_URL}/untis/teachers_subjects?semesterId=${semester!.id}`)
            .set('authorization', JSON.stringify({ email: user.email }));
        expect(result.statusCode).toEqual(200);
        expect(result.body.length).toEqual(1);
        const subjects = result.body[0];
        expect(subjects.userId).toEqual(ambrosio.id);
        expect(subjects.shortName).toEqual(abc.name);
        expect(subjects.lang).toEqual('de');
        expect(subjects.semesterId).toEqual(semester!.id);
        expect(subjects.subjects.length).toEqual(2);
        expect(_.sortBy(subjects.subjects, 'name')).toEqual([
            { name: 'IN', description: 'Informatik' },
            { name: 'M', description: 'Mathematik' }
        ]);
        expect(mNotification).toHaveBeenCalledTimes(0);
    });
});
