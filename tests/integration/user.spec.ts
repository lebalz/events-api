import request from 'supertest';
import { truncate } from "./helpers/db";
import prisma from '../../src/prisma';
import app, { API_URL } from '../../src/app';
import { generateUser, userSequence } from '../factories/user';
import { Department, Event, EventState, Role, Semester, TeachingAffected, UntisTeacher, User } from '@prisma/client';
import { generateUntisTeacher } from '../factories/untisTeacher';
import { eventSequence, eventSequenceUnchecked, generateEvent } from '../factories/event';
import { generateSemester } from '../factories/semester';
import { departmentSequence, generateDepartment } from '../factories/department';
import { generateUntisClass } from '../factories/untisClass';
import { generateUntisLesson } from '../factories/untisLesson';
import { existsSync, readFileSync } from 'fs';
import { createEvents } from 'ics';
import stubs from './stubs/semesters.json';
import { prepareEvent } from '../../src/services/createIcs';
import { notify } from '../../src/middlewares/notify.nop';
import { IoEvent } from '../../src/routes/socketEventTypes';
import { IoRoom } from '../../src/routes/socketEvents';
import { faker } from '@faker-js/faker';
import { syncUntis2DB } from '../../src/services/syncUntis2DB';

jest.mock('../../src/services/fetchUntis');
jest.mock('../../src/middlewares/notify.nop');
const mNotification = <jest.Mock<typeof notify>>notify;

beforeAll(() => {
    return truncate();
});

afterAll(() => {
    return prisma.$disconnect();
});
afterEach(() => {
    return truncate();
});

const prepareUser = (user: User) => {
    return JSON.parse(JSON.stringify(user));
}

describe(`GET ${API_URL}/user authorized`, () => {
    it('rejects unauthorized users', async () => {
        const result = await request(app)
            .get(`${API_URL}/user`)
            .set('authorization', JSON.stringify({ noAuth: true }));
        expect(result.statusCode).toEqual(401);
        expect(mNotification).toHaveBeenCalledTimes(0);
    });
    it('authenticates users', async () => {
        await prisma.user.create({
            data: generateUser({ email: 'foo@bar.ch' })
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
        expect(mNotification).toHaveBeenCalledTimes(0);
    });
});


describe(`GET ${API_URL}/user/all`, () => {
    it('rejects unauthorized users', async () => {
        const result = await request(app)
            .get(`${API_URL}/user/all`)
            .set('authorization', JSON.stringify({ noAuth: true }));
        expect(result.statusCode).toEqual(401);
        expect(mNotification).toHaveBeenCalledTimes(0);
    });
    it('returns all users', async () => {
        const user = await prisma.user.create({
            data: generateUser({ email: 'foo@bar.ch' })
        });
        const users = await Promise.all(userSequence(10).map(user => {
            return prisma.user.create({
                data: user
            });
        }));
        const result = await request(app)
            .get(`${API_URL}/user/all`)
            .set('authorization', JSON.stringify({ email: user.email }));
        expect(result.statusCode).toEqual(200);
        expect(result.body).toHaveLength(11);
        [user, ...users].forEach((usr, i) => {
            const res = result.body.find((u: User) => u.id === usr.id);
            expect(res).toEqual({
                ...usr,
                updatedAt: expect.any(String),
                createdAt: expect.any(String)
            });
        });
        expect(mNotification).toHaveBeenCalledTimes(0);
    });
});

describe(`GET ${API_URL}/user/:id authorized`, () => {
    it('returns user', async () => {
        const user = await prisma.user.create({
            data: generateUser({ email: 'foo@bar.ch' })
        });
        const result = await request(app)
            .get(`${API_URL}/user/${user.id}`)
            .set('authorization', JSON.stringify({ email: user.email }));
        expect(result.statusCode).toEqual(200);
        expect(result.body).toEqual(prepareUser(user));
        expect(mNotification).toHaveBeenCalledTimes(0);
    });
    it('returns other user', async () => {
        const user = await prisma.user.create({
            data: generateUser({ email: 'foo@bar.ch' })
        });
        const other = await prisma.user.create({
            data: generateUser({ email: 'other@user.ch' })
        });
        const result = await request(app)
            .get(`${API_URL}/user/${other.id}`)
            .set('authorization', JSON.stringify({ email: user.email }));
        expect(result.statusCode).toEqual(200);
        expect(result.body).toEqual(prepareUser(other));
        expect(mNotification).toHaveBeenCalledTimes(0);
    });
});

describe(`PUT ${API_URL}/user/:id/link_to_untis`, () => {
    it('can link self to an untis teacher', async () => {
        const user = await prisma.user.create({
            data: generateUser({ email: 'foo@bar.ch' })
        });
        const untisUser = await prisma.untisTeacher.create({
            data: generateUntisTeacher({ id: 1234 })
        });
        const result = await request(app)
            .put(`${API_URL}/user/${user.id}/link_to_untis`)
            .set('authorization', JSON.stringify({ email: user.email }))
            .send({ data: { untisId: untisUser.id } });
        expect(result.statusCode).toEqual(200);
        expect(result.body).toEqual({
            ...prepareUser(user),
            untisId: untisUser.id,
            updatedAt: expect.any(String)
        });
        expect(mNotification).toHaveBeenCalledTimes(1);
        expect(mNotification.mock.calls[0][0]).toEqual({
            event: IoEvent.CHANGED_RECORD,
            message: { record: 'USER', id: user.id },
            to: IoRoom.ALL
        });
    });
    it('can not link to a used untis teacher', async () => {
        const untisUser = await prisma.untisTeacher.create({
            data: generateUntisTeacher({ id: 1234 })
        });
        const reto = await prisma.user.create({
            data: generateUser({ email: 'reto@bar.ch', untisId: untisUser.id })
        });
        const user = await prisma.user.create({
            data: generateUser({ email: 'foo@bar.ch' })
        });
        const result = await request(app)
            .put(`${API_URL}/user/${user.id}/link_to_untis`)
            .set('authorization', JSON.stringify({ email: user.email }))
            .send({ data: { untisId: untisUser.id } });
        expect(result.statusCode).toEqual(400);
        expect(mNotification).toHaveBeenCalledTimes(0);
    });
    it('can not link for other users', async () => {
        const reto = await prisma.user.create({
            data: generateUser({ email: 'reto@bar.ch' })
        });
        const user = await prisma.user.create({
            data: generateUser({ email: 'foo@bar.ch' })
        });
        const untisUser = await prisma.untisTeacher.create({
            data: generateUntisTeacher({ id: 1234 })
        });

        const result = await request(app)
            .put(`${API_URL}/user/${user.id}/link_to_untis`)
            .set('authorization', JSON.stringify({ email: reto.email }))
            .send({ data: { untisId: untisUser.id } });
        expect(result.statusCode).toEqual(403);
        expect(mNotification).toHaveBeenCalledTimes(0);
    });
    it('can link other users when admin role', async () => {
        const admin = await prisma.user.create({
            data: generateUser({ email: 'admin@bar.ch', role: Role.ADMIN })
        });
        const user = await prisma.user.create({
            data: generateUser({ email: 'foo@bar.ch' })
        });
        const untisUser = await prisma.untisTeacher.create({
            data: generateUntisTeacher({ id: 1234 })
        });

        const result = await request(app)
            .put(`${API_URL}/user/${user.id}/link_to_untis`)
            .set('authorization', JSON.stringify({ email: admin.email }))
            .send({ data: { untisId: untisUser.id } });
        expect(result.statusCode).toEqual(200);
        expect(result.body).toEqual({
            ...prepareUser(user),
            untisId: untisUser.id,
            updatedAt: expect.any(String)
        });
        expect(mNotification).toHaveBeenCalledTimes(1);
        expect(mNotification.mock.calls[0][0]).toEqual({
            event: IoEvent.CHANGED_RECORD,
            message: { record: 'USER', id: user.id },
            to: IoRoom.ALL
        });
    });
});

describe(`POST ${API_URL}/user/:id/create_ics`, () => {
    it('can create an ics for the users calendar', async () => {
        const semStart = faker.date.soon();
        const semEnd = faker.date.future({ refDate: semStart, years: 1 });
        const sem = await prisma.semester.create({
            data: generateSemester({
                start: semStart,
                end: semEnd,
                untisSyncDate: faker.date.between({ from: semStart, to: semEnd })
            })
        });
        const department = await prisma.department.create({ data: generateDepartment({ classLetters: ['h'], letter: 'G' }) });
        const teacher = await prisma.untisTeacher.create({ data: generateUntisTeacher() });
        const klass = await prisma.untisClass.create({
            data: {
                ...generateUntisClass({ departmentId: department.id, name: '25Gh' }),
                teachers: {
                    connect: {
                        id: teacher.id
                    }
                }
            }
        });
        const lesson = await prisma.untisLesson.create({
            data: generateUntisLesson(
                sem.id, {
                teachers: {
                    connect: { id: teacher.id }
                },
                classes: {
                    connect: { id: klass.id }
                }
            }
            )
        });

        const user = await prisma.user.create({
            data: generateUser({ email: 'foo@bar.ch', untisId: teacher.id })
        });

        const event = await prisma.event.create({
            data: generateEvent({
                authorId: user.id,
                state: EventState.PUBLISHED,
                departments: {
                    connect: {
                        id: department.id
                    }
                },
                teachingAffected: TeachingAffected.YES,
                start: new Date(semStart.getTime() + 1000),
                end: new Date(semStart.getTime() + 1000 * 60 * 60),
            })
        });

        const result = await request(app)
            .post(`${API_URL}/user/${user.id}/create_ics`)
            .set('authorization', JSON.stringify({ email: user.email }));
        expect(result.statusCode).toEqual(200);
        expect(result.body).toEqual({
            ...prepareUser(user),
            icsLocator: expect.any(String),
            updatedAt: expect.any(String)
        });
        expect(existsSync(`${__dirname}/../test-data/ical/${result.body.icsLocator}`)).toBeTruthy();
        const ical = readFileSync(`${__dirname}/../test-data/ical/${result.body.icsLocator}`, { encoding: 'utf8' });
        const ics = createEvents([prepareEvent(event)]);
        expect(ical).toEqual(
            ics.value
        );
        expect(mNotification).toHaveBeenCalledTimes(1);
        expect(mNotification.mock.calls[0][0]).toEqual({
            event: IoEvent.CHANGED_RECORD,
            message: { record: 'USER', id: user.id },
            to: user.id,
            toSelf: false
        });
    });
});

describe(`POST ${API_URL}/user/:id/set_role`, () => {
    it('user can not set role of self', async () => {
        const user = await prisma.user.create({
            data: generateUser({ email: 'foo@bar.ch' })
        });
        const result = await request(app)
            .put(`${API_URL}/user/${user.id}/set_role`)
            .set('authorization', JSON.stringify({ email: user.email }))
            .send({ data: { role: Role.ADMIN } });
        expect(result.statusCode).toEqual(403);
        expect(mNotification).toHaveBeenCalledTimes(0);
    });
    it('admin can set role of self', async () => {
        const admin = await prisma.user.create({
            data: generateUser({ email: 'admin@bar.ch', role: Role.ADMIN })
        });
        const result = await request(app)
            .put(`${API_URL}/user/${admin.id}/set_role`)
            .set('authorization', JSON.stringify({ email: admin.email }))
            .send({ data: { role: Role.USER } });
        expect(result.statusCode).toEqual(200);
        expect(result.body).toEqual({
            ...prepareUser(admin),
            role: Role.USER,
            updatedAt: expect.any(String)
        });
        expect(mNotification).toHaveBeenCalledTimes(1);
        expect(mNotification.mock.calls[0][0]).toEqual({
            event: IoEvent.CHANGED_RECORD,
            message: { record: 'USER', id: admin.id },
            to: admin.id,
            toSelf: false
        });
    });
    it('admin can grant a user admin privileges', async () => {
        const user = await prisma.user.create({
            data: generateUser({ email: 'foo@bar.ch' })
        });
        const admin = await prisma.user.create({
            data: generateUser({ email: 'admin@bar.ch', role: Role.ADMIN })
        });
        const result = await request(app)
            .put(`${API_URL}/user/${user.id}/set_role`)
            .set('authorization', JSON.stringify({ email: admin.email }))
            .send({ data: { role: Role.ADMIN } });
        expect(result.statusCode).toEqual(200);
        expect(result.body).toEqual({
            ...prepareUser(user),
            role: Role.ADMIN,
            updatedAt: expect.any(String)
        });
        expect(mNotification).toHaveBeenCalledTimes(1);
        expect(mNotification.mock.calls[0][0]).toEqual({
            event: IoEvent.CHANGED_RECORD,
            message: { record: 'USER', id: user.id },
            to: user.id,
            toSelf: false
        });
    });
    it('admin can revoke admin privileges', async () => {
        const user = await prisma.user.create({
            data: generateUser({ email: 'foo@bar.ch', role: Role.ADMIN })
        });
        const admin = await prisma.user.create({
            data: generateUser({ email: 'admin@bar.ch', role: Role.ADMIN })
        });
        const result = await request(app)
            .put(`${API_URL}/user/${user.id}/set_role`)
            .set('authorization', JSON.stringify({ email: admin.email }))
            .send({ data: { role: Role.USER } });
        expect(result.statusCode).toEqual(200);
        expect(result.body).toEqual({
            ...prepareUser(user),
            role: Role.USER,
            updatedAt: expect.any(String)
        });
        expect(mNotification).toHaveBeenCalledTimes(1);
        expect(mNotification.mock.calls[0][0]).toEqual({
            event: IoEvent.CHANGED_RECORD,
            message: { record: 'USER', id: user.id },
            to: user.id,
            toSelf: false
        });
    });
});

describe(`GET ${API_URL}/user/:id/affected-event-ids`, () => {
    it('can not get affected event ids without a valid semester', async () => {
        const user = await prisma.user.create({ data: generateUser({}) });
        const result = await request(app)
            .get(`${API_URL}/user/${user.id}/affected-event-ids`)
            .set('authorization', JSON.stringify({ email: user.email }));
        expect(result.statusCode).toEqual(404);
        expect(mNotification).toHaveBeenCalledTimes(0);
    });

    describe('with existing semesters', () => {
        let semester: Semester;
        let departments: Department[];
        let untisTeachers: UntisTeacher[];
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
            // await prisma.department.createMany({ data: departmentSequence(5)});
            semester = await prisma.semester.findFirst({ where: { name: 'HS2023' } }) as Semester;
            await syncUntis2DB(semester!.id);
            untisTeachers = await prisma.untisTeacher.findMany();
            departments = await prisma.department.findMany();
        });
        it('returns empty list when no events are present for the current semester', async () => {
            /** ensure a semester for the current date is present */
            await prisma.semester.create({
                data: generateSemester({
                    start: faker.date.recent(),
                    end: faker.date.future()
                })
            });
            const user = await prisma.user.create({ data: generateUser({}) });
            const result = await request(app)
                .get(`${API_URL}/user/${user.id}/affected-event-ids`)
                .set('authorization', JSON.stringify({ email: user.email }));
            expect(result.statusCode).toEqual(200);
            expect(result.body).toEqual([]);
            expect(mNotification).toHaveBeenCalledTimes(0);
        });
        it('returns no events when only draft events are present semester', async () => {
            const user = await prisma.user.create({ data: generateUser({ untisId: untisTeachers[0].id }) });
            const events = await Promise.all([1, 2, 3, 4, 5].map(() => {
                const start = faker.date.between({ from: semester.start, to: semester.end });
                return prisma.event.create({ data: generateEvent({ authorId: user.id, start: start, end: faker.date.between({ from: start, to: semester.end }) }) });
            }))
            const result = await request(app)
                .get(`${API_URL}/user/${user.id}/affected-event-ids?semesterId=${semester.id}`)
                .set('authorization', JSON.stringify({ email: user.email }));
            expect(result.statusCode).toEqual(200);
            expect(result.body).toEqual([]);
            expect(mNotification).toHaveBeenCalledTimes(0);
        });
        it('returns published affecting teachers semester', async () => {
            const user = await prisma.user.create({ data: generateUser({ untisId: untisTeachers[0].id }) });
            const gbsl = departments.find((d) => d.name === 'GBSL' && d.letter === 'G')!;
            const gbjb = departments.find((d) => d.name === 'GBJB' && d.letter === 'm')!;
            const gbslEvents = await Promise.all([1, 2, 3, 4, 5].map(() => {
                const start = faker.date.between({ from: semester.start, to: semester.end });
                return prisma.event.create({
                    data: generateEvent({
                        authorId: user.id,
                        start: start,
                        end: faker.date.between({ from: start, to: semester.end }),
                        state: EventState.PUBLISHED,
                        teachersOnly: true,
                        departments: {
                            connect: { id: gbsl.id }
                        }
                    })
                });
            }))
            const gbjbEvents = await Promise.all([1, 2, 3, 4, 5].map(() => {
                const start = faker.date.between({ from: semester.start, to: semester.end });
                return prisma.event.create({
                    data: generateEvent({
                        authorId: user.id,
                        start: start,
                        end: faker.date.between({ from: start, to: semester.end }),
                        state: EventState.PUBLISHED,
                        teachersOnly: true,
                        departments: {
                            connect: { id: gbjb.id }
                        }
                    })
                });
            }))
            const result = await request(app)
                .get(`${API_URL}/user/${user.id}/affected-event-ids?semesterId=${semester.id}`)
                .set('authorization', JSON.stringify({ email: user.email }));
            expect(result.statusCode).toEqual(200);
            expect(result.body).toHaveLength(5);
            expect(result.body.sort()).toEqual(gbslEvents.map((e: Event) => e.id).sort());
            expect(mNotification).toHaveBeenCalledTimes(0);
        });
    });
});

