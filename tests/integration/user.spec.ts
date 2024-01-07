import request from 'supertest';
import { truncate } from "../helpers/db";
import prisma from '../../src/prisma';
import app, { API_URL } from '../../src/app';
import { generateUser, userSequence } from '../factories/user';
import { Department, Event, EventAudience, EventState, Prisma, Role, Semester, TeachingAffected, UntisTeacher, User } from '@prisma/client';
import { generateUntisTeacher } from '../factories/untisTeacher';
import { generateEvent } from '../factories/event';
import { generateSemester } from '../factories/semester';
import { generateDepartment } from '../factories/department';
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
import { fetchUntis } from '../../src/services/__mocks__/fetchUntis';
import { UntisDataProps, generateUntisData } from '../factories/untisData';
import _ from 'lodash';

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
                audience: EventAudience.ALL,
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
        expect(existsSync(`${__dirname}/../test-data/ical/de/${result.body.icsLocator}`)).toBeTruthy();
        expect(existsSync(`${__dirname}/../test-data/ical/fr/${result.body.icsLocator}`)).toBeTruthy();
        const icalDe = readFileSync(`${__dirname}/../test-data/ical/de/${result.body.icsLocator}`, { encoding: 'utf-8' });
        const icalFr = readFileSync(`${__dirname}/../test-data/ical/fr/${result.body.icsLocator}`, { encoding: 'utf-8' });
        const icsDe = createEvents([prepareEvent(event, 'de')]);
        const icsFr = createEvents([prepareEvent(event, 'fr')]);
        expect(icalDe).toEqual(
            icsDe.value
        ); expect(icalFr).toEqual(
            icsFr.value
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
        const _data: UntisDataProps = {
            schoolyear: { start: 2023 },
            subjects: [
                { name: 'M', longName: 'Mathematik' },
                { name: 'IN', longName: 'Informatik' },
                { name: 'EFIN', longName: 'EF Informatik' },
                { name: 'E', longName: 'Englisch' }
            ],
            teachers: [
                { name: 'abc', longName: 'Ambrosio Clark [GBSL, GBJB]', sex: 'M' },
                { name: 'xyz', longName: 'Xavianda Zorro [GBSL]', sex: 'F' },
                { name: 'AAA', longName: 'Louise Bommeraux [GBJB]', sex: 'F'}
            ],
            classes: [
                { name: '24i', sf: 'BG/WR' },
                { name: '24a', sf: 'PAM' },
                { name: '26e', sf: 'PAM/BG' },
                { name: '25B', sf: 'BC' },
                { name: '26A', sf: 'WR' }
            ],
            lessons: [
                { subject: 'IN', day: 'Di', teachers: ['abc'], classes: ['26e'], start: 1120, end: 1205, room: 'D114' },
                { subject: 'M', day: 'Di', teachers: ['abc'], classes: ['24i'], start: 1550, end: 1635, room: 'G001' },
                { subject: 'E', day: 'Mi', teachers: ['xyz'], classes: ['24i'], start: 730, end: 815, room: 'D113' },
                { subject: 'IN', day: 'Mi', teachers: ['abc'], classes: ['26e'], start: 730, end: 815, room: 'D216' },
                { subject: 'IN', day: 'Mi', teachers: ['AAA'], classes: ['25B'], start: 730, end: 815, room: 'F207' },
                { subject: 'IN', day: 'Mi', teachers: ['abc'], classes: ['26A'], start: 1215, end: 1300, room: 'D113' },
                { subject: 'M', day: 'Mi', teachers: ['abc'], classes: ['24i'], start: 1025, end: 1110, room: 'D103' },
                { subject: 'EFIN', day: 'Fr', teachers: ['abc'], classes: ['24a', '24i'], start: 1305, end: 1350, room: 'D206' },
            ]
        };
        let data: UntisDataProps = _.cloneDeep(_data);
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
            semester = await prisma.semester.findFirst({ where: { name: 'HS2023' } }) as Semester;
            await syncUntis2DB(semester!.id, (sem: Semester) => fetchUntis(sem, generateUntisData(data)));
            untisTeachers = await prisma.untisTeacher.findMany();
            departments = await prisma.department.findMany();
        });
        describe('filtered by semester', () => {
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
        })
        describe('selected by department', () => {
            it('respects departments of teached classes', async () => {
                /**
                 * 10 events, audience[LP], 5 for GBSL, 5 for GBJB
                 * 
                 * xyz -> teaches GBSL -> 5 events
                 * abc -> teaches GBSL and GBJB -> 10 events
                 */
                const gbslTeacher = await prisma.user.create({ data: generateUser({ untisId: untisTeachers.find(t => t.name === 'xyz')!.id }) });
                const gbslGbjbTeacher = await prisma.user.create({ data: generateUser({ untisId: untisTeachers.find(t => t.name === 'abc')!.id }) });
                const gbsl = departments.find((d) => d.name === 'GBSL' && d.letter === 'G')!;
                const gbjb = departments.find((d) => d.name === 'GBJB' && d.letter === 'm')!;
                const gbslEvents = await Promise.all([1, 2, 3, 4, 5].map(() => {
                    const start = faker.date.between({ from: semester.start, to: semester.end });
                    return prisma.event.create({
                        data: generateEvent({
                            authorId: gbslTeacher.id,
                            start: start,
                            end: faker.date.between({ from: start, to: semester.end }),
                            state: EventState.PUBLISHED,
                            audience: EventAudience.LP,
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
                            authorId: gbslGbjbTeacher.id,
                            start: start,
                            end: faker.date.between({ from: start, to: semester.end }),
                            state: EventState.PUBLISHED,
                            audience: EventAudience.LP,
                            departments: {
                                connect: { id: gbjb.id }
                            }
                        })
                    });
                }))

                const resultGbslTeacher = await request(app)
                    .get(`${API_URL}/user/${gbslTeacher.id}/affected-event-ids?semesterId=${semester.id}`)
                    .set('authorization', JSON.stringify({ email: gbslTeacher.email }));
                expect(resultGbslTeacher.statusCode).toEqual(200);
                expect(resultGbslTeacher.body).toHaveLength(5);
                expect(resultGbslTeacher.body.sort()).toEqual(gbslEvents.map((e: Event) => e.id).sort());

                const resultGbslGbjbTeacher = await request(app)
                    .get(`${API_URL}/user/${gbslGbjbTeacher.id}/affected-event-ids?semesterId=${semester.id}`)
                    .set('authorization', JSON.stringify({ email: gbslGbjbTeacher.email }));
                expect(resultGbslGbjbTeacher.statusCode).toEqual(200);
                expect(resultGbslGbjbTeacher.body).toHaveLength(10);
                expect(resultGbslGbjbTeacher.body.sort()).toEqual([...gbslEvents, ...gbjbEvents].map((e: Event) => e.id).sort());
                expect(mNotification).toHaveBeenCalledTimes(0);
            });
            describe('filtered by audience', () => {
                let audience: EventAudience = EventAudience.ALL;
                let author: User;
                let abc: User;
                let xyz: User;
                let AAA: User;
                let affectingEvent: Event;
                beforeEach(async () => {
                    const gbsl = departments.find((d) => d.name === 'GBSL' && d.letter === 'G')!;
                    author = await prisma.user.create({ data: generateUser() });
                    abc = await prisma.user.create({ data: generateUser({ firstName: 'abc', untisId: untisTeachers.find(t => t.name === 'abc')!.id }) });
                    AAA = await prisma.user.create({ data: generateUser({ firstName: 'AAA', untisId: untisTeachers.find(t => t.name === 'AAA')!.id }) });
                    xyz = await prisma.user.create({ data: generateUser({ firstName: 'xyz', untisId: untisTeachers.find(t => t.name === 'xyz')!.id }) });
                    affectingEvent = await prisma.event.create({
                        data: generateEvent({
                            authorId: author.id,
                            start: new Date('2023-10-18T08:00'), /* 18.10.2023 is a Mittwoch */
                            end: new Date('2023-10-18T12:00'),
                            state: EventState.PUBLISHED,
                            departments: {
                                connect: { id: gbsl.id }
                            },
                            audience: audience
                        })
                    });
                });
                describe('audience: ALL', () => {
                    beforeAll(() => {
                        audience = EventAudience.ALL;
                    });
                    afterEach(() => {
                        data = _.cloneDeep(_data);
                    });
                    describe('does list the event for teachers of the gbsl', () => {
                        let hij: User;
                        beforeEach(async () => {
                            // xyz teaches the class on a different day
                            data.lessons.push({ subject: 'E', day: 'Do', teachers: ['xyz'], classes: ['26e'], start: 825, end: 910, room: 'D113' });
                            // hij does not teach the class...
                            data.teachers.push({ name: 'hij', longName: 'Jimmy Hermann', sex: 'M' });
                            data.subjects.push({ name: 'F', longName: 'Französisch' });
                            data.classes.push({ name: '26a', sf: 'WR' });
                            data.lessons.push({ subject: 'F', day: 'Mo', teachers: ['hij'], classes: ['26a'], start: 1120, end: 1205, room: 'D112' });
                            await syncUntis2DB(semester!.id, (sem: Semester) => fetchUntis(sem, generateUntisData(data)));
                            const untisHij = await prisma.untisTeacher.findUnique({ where: { name: 'hij' } });
                            hij = await prisma.user.create({ data: generateUser({ firstName: 'hij', untisId: untisHij!.id }) });
                        });
                        ['xyz', 'abc', 'hij'].forEach(async (name: string) => {
                            it(`displays the event for gbsl teacher ${name}`, async () => {
                                const user = (await prisma.user.findFirst({ where: { firstName: name }, include: { untis: { include: { classes: true } } } }))!;
                                const result = await request(app)
                                    .get(`${API_URL}/user/${user.id}/affected-event-ids?semesterId=${semester.id}`)
                                    .set('authorization', JSON.stringify({ email: user.email }));
                                expect(result.statusCode).toEqual(200);
                                expect(result.body).toHaveLength(1);
                                expect(result.body).toEqual([affectingEvent.id]);
                            })
                        });
                        ['AAA'].forEach(async (name: string) => {
                            it(`does not display non-gbsl teacher ${name}`, async () => {
                                const user = (await prisma.user.findFirst({ where: { firstName: name }, include: { untis: { include: { classes: true } } } }))!;
                                const result = await request(app)
                                    .get(`${API_URL}/user/${user.id}/affected-event-ids?semesterId=${semester.id}`)
                                    .set('authorization', JSON.stringify({ email: user.email }));
                                expect(result.statusCode).toEqual(200);
                                expect(result.body).toHaveLength(0);
                            })
                        });
                    })
                });
    
                describe('audience: KLP', () => {
                    beforeAll(() => {
                        audience = EventAudience.KLP;
                    });
                    afterAll(() => {
                        data = _.cloneDeep(_data);
                    });
                    it('does not list the event for non-klp teachers', async () => {
                        const resultAbc = await request(app)
                            .get(`${API_URL}/user/${abc.id}/affected-event-ids?semesterId=${semester.id}`)
                            .set('authorization', JSON.stringify({ email: abc.email }));
                        expect(resultAbc.statusCode).toEqual(200);
                        expect(resultAbc.body).toHaveLength(0);
                    });
                    describe('does list the event for the KLP of the class 26Ge', () => {
                        let thisData: UntisDataProps;
                        beforeAll(async () => {
                            data.subjects.push({ name: 'KS', longName: 'Klassenstunde' });
                            // abc is KLP of 26Ge
                            data.lessons.push({ subject: 'KS', day: 'Do', teachers: ['abc'], classes: ['26e'], start: 1120, end: 1205, room: 'D114' });
                            // xyz is KLP (KS or MC) of 25B
                            data.lessons.push({ subject: 'KS', day: 'Do', teachers: ['xyz'], classes: ['25B'], start: 1120, end: 1205, room: 'D115' });
                            // xyz teaches the class within the event
                            data.lessons.push({ subject: 'E', day: 'Mi', teachers: ['xyz'], classes: ['26e'], start: 1120, end: 1205, room: 'D113' });
                            // hij does not teach the class...
                            data.teachers.push({ name: 'hij', longName: 'Jimmy Hermann', sex: 'M' });
                            data.subjects.push({ name: 'F', longName: 'Französisch' });
                            data.classes.push({ name: '26a', sf: 'WR' });
                            data.lessons.push({ subject: 'F', day: 'Mo', teachers: ['hij'], classes: ['26a'], start: 1120, end: 1205, room: 'D112' });
                            thisData = _.cloneDeep(data);
                        });
                        beforeEach(async () => {
                            await prisma.user.create({ data: generateUser({ firstName: 'hij', untisId: untisTeachers.find(t => t.name === 'hij')!.id }) });
                        });
                        afterEach(() => {
                            data = _.cloneDeep(thisData);
                        });
                        afterAll(() => {
                            data = _.cloneDeep(_data);
                        });
                        ['abc'].forEach(async (name: string) => {
                            it(`displays the event for ${name}`, async () => {
                                const user = (await prisma.user.findFirst({ where: { firstName: name }, include: { untis: { include: { classes: true } } } }))!;
                                const result = await request(app)
                                    .get(`${API_URL}/user/${user.id}/affected-event-ids?semesterId=${semester.id}`)
                                    .set('authorization', JSON.stringify({ email: user.email }));
                                expect(result.statusCode).toEqual(200);
                                expect(result.body).toHaveLength(1);
                                expect(result.body).toEqual([affectingEvent.id]);
                            })
                        });
                        ['hij', 'AAA', 'xyz'].forEach(async (name: string) => {
                            it(`does not display for others (here: ${name}) except klp[abc] of 26Ge`, async () => {
                                const user = (await prisma.user.findFirst({ where: { firstName: name }, include: { untis: { include: { classes: true } } } }))!;
                                const result = await request(app)
                                    .get(`${API_URL}/user/${user.id}/affected-event-ids?semesterId=${semester.id}`)
                                    .set('authorization', JSON.stringify({ email: user.email }));
                                expect(result.statusCode).toEqual(200);
                                expect(result.body).toHaveLength(0);
                            })
                        });    
                    })
                });
    
                describe('audience: STUDENTS', () => {
                    beforeAll(() => {
                        audience = EventAudience.STUDENTS;
                    });
                    afterAll(() => {
                        data = _.cloneDeep(_data);
                    });
                    describe('does list the event for the KLP and affected LPs of the department gbsl', () => {
                        let thisData: UntisDataProps;
                        let infoElternabend: Event;
                        beforeAll(async () => {
                            data.subjects.push({ name: 'KS', longName: 'Klassenstunde' });
                            // abc is KLP of 26Ge
                            data.lessons.push({ subject: 'KS', day: 'Do', teachers: ['abc'], classes: ['26e'], start: 1120, end: 1205, room: 'D114' });
                            // xyz teaches the class within the event
                            data.lessons.push({ subject: 'E', day: 'Mi', teachers: ['xyz'], classes: ['26e'], start: 1120, end: 1205, room: 'D113' });
                            // hij does teach the class, but not within the event...
                            data.teachers.push({ name: 'hij', longName: 'Jimmy Hermann', sex: 'M' });
                            data.subjects.push({ name: 'F', longName: 'Französisch' });
                            data.lessons.push({ subject: 'F', day: 'Mo', teachers: ['hij'], classes: ['26e'], start: 1120, end: 1205, room: 'D112' });
                            thisData = _.cloneDeep(data);
                        });
                        beforeEach(async () => {
                            await prisma.user.create({ data: generateUser({ firstName: 'hij', untisId: untisTeachers.find(t => t.name === 'hij')!.id }) });
                            const gbsl = departments.find((d) => d.name === 'GBSL' && d.letter === 'G')!;
                            /* add a second event for 26Ge, that does not affect lessons */
                            infoElternabend = await prisma.event.create({
                                data: generateEvent({
                                    authorId: author.id,
                                    start: new Date('2023-10-18T20:00'), /* 18.10.2023 is a Mittwoch */
                                    end: new Date('2023-10-18T21:30'),
                                    description: 'Informations-Elternabend', /** not realistic, since Elternabend would have audience ALL */
                                    state: EventState.PUBLISHED,
                                    departments: {
                                        connect: { id: gbsl.id }
                                    },
                                    audience: EventAudience.STUDENTS
                                })
                            });
                        });
                        afterEach(() => {
                            data = _.cloneDeep(thisData);
                        });
                        afterAll(() => {
                            data = _.cloneDeep(_data);
                        });
                        ['abc', 'xyz'].forEach(async (name: string) => {
                            it(`displays the event for gbsl teacher ${name}`, async () => {
                                const user = (await prisma.user.findFirst({ where: { firstName: name }, include: { untis: { include: { classes: true, lessons: true } } } }))!;
                                const result = await request(app)
                                    .get(`${API_URL}/user/${user.id}/affected-event-ids?semesterId=${semester.id}`)
                                    .set('authorization', JSON.stringify({ email: user.email }));
                                expect(result.statusCode).toEqual(200);
                                if (name === 'abc') { /* KLP */
                                    expect(result.body).toHaveLength(2);
                                    expect(result.body.sort()).toEqual([infoElternabend.id, affectingEvent.id].sort());
                                } else {
                                    expect(result.body).toHaveLength(1);
                                    expect(result.body).toEqual([affectingEvent.id]);
                                }
                            })
                        });
                        /* hij and AAA does not teach gbsl students during the event */
                        ['hij', 'AAA'].forEach(async (name: string) => {
                            it(`does not display for teacher ${name}`, async () => {
                                const user = (await prisma.user.findFirst({ where: { firstName: name }, include: { untis: { include: { classes: true } } } }))!;
                                const result = await request(app)
                                    .get(`${API_URL}/user/${user.id}/affected-event-ids?semesterId=${semester.id}`)
                                    .set('authorization', JSON.stringify({ email: user.email }));
                                expect(result.statusCode).toEqual(200);
                                expect(result.body).toHaveLength(0);
                            })
                        });
                    })
                });
    
                describe('audience: LP', () => {
                    beforeAll(() => {
                        audience = EventAudience.LP;
                    });
                    afterEach(() => {
                        data = _.cloneDeep(_data);
                    });
                    describe('does list the event for teachers of gbsl', () => {
                        beforeEach(async () => {
                            // xyz teaches the class on a different day
                            data.lessons.push({ subject: 'E', day: 'Do', teachers: ['xyz'], classes: ['26e'], start: 825, end: 910, room: 'D113' });
                            // hij does not teach the class...
                            data.teachers.push({ name: 'hij', longName: 'Jimmy Hermann', sex: 'M' });
                            data.subjects.push({ name: 'F', longName: 'Französisch' });
                            data.classes.push({ name: '26a', sf: 'WR' });
                            data.lessons.push({ subject: 'F', day: 'Mo', teachers: ['hij'], classes: ['26a'], start: 1120, end: 1205, room: 'D112' });
                            await syncUntis2DB(semester!.id, (sem: Semester) => fetchUntis(sem, generateUntisData(data)));
                            const untisHij = await prisma.untisTeacher.findUnique({ where: { name: 'hij' } });
                            await prisma.user.create({ data: generateUser({ firstName: 'hij', untisId: untisHij!.id }) });
                        });
                        ['xyz', 'abc', 'hij'].forEach(async (name: string) => {
                            it(`displays the event for ${name}`, async () => {
                                const user = (await prisma.user.findFirst({ where: { firstName: name }, include: { untis: { include: { classes: true } } } }))!;
                                const result = await request(app)
                                    .get(`${API_URL}/user/${user.id}/affected-event-ids?semesterId=${semester.id}`)
                                    .set('authorization', JSON.stringify({ email: user.email }));
                                expect(result.statusCode).toEqual(200);
                                expect(result.body).toHaveLength(1);
                                expect(result.body).toEqual([affectingEvent.id]);
                            })
                        });
                        ['AAA'].forEach(async (name: string) => {
                            it(`does not display non-class team member ${name}`, async () => {
                                const user = (await prisma.user.findFirst({ where: { firstName: name }, include: { untis: { include: { classes: true } } } }))!;
                                const result = await request(app)
                                    .get(`${API_URL}/user/${user.id}/affected-event-ids?semesterId=${semester.id}`)
                                    .set('authorization', JSON.stringify({ email: user.email }));
                                expect(result.statusCode).toEqual(200);
                                expect(result.body).toHaveLength(0);
                            })
                        });
    
                    })
                });
            });
            describe('filtered by affectsDepartment2', () => {
                let audience: EventAudience = EventAudience.ALL;
                let author: User;
                let hij: User;
                let VWZ: User;
                let klp: User;
                let day: 'Mi' | 'Do' = 'Mi'
                let affectingEvent: Event;
                let affectsDepartment2 = false;
                beforeEach(async () => {
                    const gbjbBili = departments.find((d) => d.name === 'GBJB/GBSL' && d.letter === 'm')!;

                    data.teachers.push({ name: 'hij', longName: 'Jimmy Hermann', sex: 'M' });
                    data.teachers.push({ name: 'VWZ', longName: 'Vinny Zimmer', sex: 'M' });
                    data.teachers.push({ name: 'klp', longName: 'Klassenlehrperson', sex: 'F' }); /** not realistic that the KS is not from the main department, anhow... */
                    
                    data.subjects.push({ name: 'KS', longName: 'Klassenstunde' });
                    // bilingue class
                    data.classes.push({ name: '26mT', sf: 'Bilingue FR' });
                    
                    data.lessons.push({ subject: 'E', day: day, teachers: ['hij'], classes: ['26mT'], start: 825, end: 910, room: 'D113' });
                    data.lessons.push({ subject: 'M', day: day, teachers: ['VWZ'], classes: ['26mT'], start: 920, end: 1005, room: 'D113' });
                    // klp is KLP of 26mT
                    data.lessons.push({ subject: 'KS', day: day, teachers: ['klp'], classes: ['26mT'], start: 1120, end: 1205, room: 'D114' });

                    await syncUntis2DB(semester!.id, (sem: Semester) => fetchUntis(sem, generateUntisData(data)));
                    untisTeachers = await prisma.untisTeacher.findMany();
                    hij = await prisma.user.create({ data: generateUser({ firstName: 'hij', untisId: untisTeachers.find(t => t.name === 'hij')!.id }) });
                    VWZ = await prisma.user.create({ data: generateUser({ firstName: 'VWZ', untisId: untisTeachers.find(t => t.name === 'VWZ')!.id }) });
                    klp = await prisma.user.create({ data: generateUser({ firstName: 'klp', untisId: untisTeachers.find(t => t.name === 'klp')!.id }) });
                    author = await prisma.user.create({ data: generateUser() });

                    affectingEvent = await prisma.event.create({
                        data: generateEvent({
                            authorId: author.id,
                            start: new Date('2023-10-18T08:00'), /* 18.10.2023 is a Mittwoch */
                            end: new Date('2023-10-18T12:00'),
                            state: EventState.PUBLISHED,
                            departments: {
                                connect: { id: gbjbBili.id }
                            },
                            audience: audience,
                            affectsDepartment2: affectsDepartment2
                        }),
                        include: {departments: true}
                    });
                });
                afterEach(() => {
                    data = _.cloneDeep(_data);
                });
                it('sets up the data correctly', async () => {
                    const gbsl = departments.find((d) => d.name === 'GBSL' && d.letter === 'G')!;
                    const gbjb = departments.find((d) => d.name === 'GBJB' && d.letter === 'm')!;
                    const gbjbBili = departments.find((d) => d.name === 'GBJB/GBSL' && d.letter === 'm')!;
                    const kl26mT = await prisma.untisClass.findFirst({ where: { name: '26mT' }, include: {department: true, teachers: true} });
                    expect(kl26mT!.department!.name).toEqual('GBJB/GBSL');
                    expect(kl26mT!.department!.id).toEqual(gbjbBili.id);
                    expect(kl26mT!.department!.department1_Id).toEqual(gbjb.id);
                    expect(kl26mT!.department!.department2_Id).toEqual(gbsl.id);
                    expect(affectingEvent.affectsDepartment2).toBeFalsy();
                });
                describe('audience: ALL', () => {
                    beforeAll(() => {
                        audience = EventAudience.ALL;
                        day = 'Do';
                    });
                    describe('affectsDepartment2: false', () => {
                        beforeAll(() => {
                            affectsDepartment2 = false;
                        });
                        it(`displays the event only for gbjb teacher`, async () => {
                            const ev = await prisma.event.findFirst({ where: { id: affectingEvent.id }, include: {departments: true} });
                            console.log('affected', ev);
                            console.log('VWZ', VWZ);
                            const deps = await prisma.$queryRaw(Prisma.sql`select * from departments`);
                            const ut = await prisma.$queryRaw(Prisma.sql`select * from view__users_teaching`);
                            const utAgg = await prisma.$queryRaw(Prisma.sql`select * from view__users_teaching_agg`);
                            const evV = await prisma.$queryRaw(Prisma.sql`select * from view__events`);
                            console.log('Departments', deps)
                            console.log('Users Teaching', ut);
                            console.log('Users Teaching Agg', utAgg);
                            console.log('Event View', evV);
                            const view1 = await prisma.view_AffectedByEvents.findMany();
                            const view2 = await prisma.view_UsersAffectedByEvents.findMany();
                            console.log('view1', view1);
                            console.log('view2', view2);
                            const viewDef1 = await prisma.$queryRaw(Prisma.sql`select definition from pg_views where viewname = 'view__affected_by_events'`);
                            const viewDef2 = await prisma.$queryRaw(Prisma.sql`select definition from pg_views where viewname = 'view__users_affected_by_events'`);
                            console.log('viewDef1', viewDef1);
                            console.log('viewDef2', viewDef2);

                            const gbjbResult = await request(app)
                                .get(`${API_URL}/user/${VWZ.id}/affected-event-ids?semesterId=${semester.id}`)
                                .set('authorization', JSON.stringify({ email: VWZ.email }));
                            expect(gbjbResult.statusCode).toEqual(200);
                            expect(gbjbResult.body).toHaveLength(1);
                            expect(gbjbResult.body).toEqual([affectingEvent.id]);
    
                            const gbslResult = await request(app)
                                .get(`${API_URL}/user/${hij.id}/affected-event-ids?semesterId=${semester.id}`)
                                .set('authorization', JSON.stringify({ email: hij.email }));
                            expect(gbslResult.statusCode).toEqual(200);
                            expect(gbslResult.body).toHaveLength(0);
                        });
                    });
                    describe('affectsDepartment2: true', () => {
                        beforeAll(() => {
                            affectsDepartment2 = true;
                        });
                        it(`displays the event only gbjb and gbsl teachers`, async () => {
                            const gbjbResult = await request(app)
                                .get(`${API_URL}/user/${VWZ.id}/affected-event-ids?semesterId=${semester.id}`)
                                .set('authorization', JSON.stringify({ email: VWZ.email }));
                            expect(gbjbResult.statusCode).toEqual(200);
                            expect(gbjbResult.body).toHaveLength(1);
                            expect(gbjbResult.body).toEqual([affectingEvent.id]);
    
                            const gbslResult = await request(app)
                                .get(`${API_URL}/user/${hij.id}/affected-event-ids?semesterId=${semester.id}`)
                                .set('authorization', JSON.stringify({ email: hij.email }));
                            expect(gbslResult.statusCode).toEqual(200);
                            expect(gbslResult.body).toHaveLength(1);
                            expect(gbslResult.body).toEqual([affectingEvent.id]);
                        });
                    });
                })
                describe('audience: LP', () => {
                    beforeAll(() => {
                        audience = EventAudience.LP;
                        day = 'Do';
                    });
                    describe('affectsDepartment2: false', () => {
                        beforeAll(() => {
                            affectsDepartment2 = false;
                        });
                        it(`displays the event only for gbjb teacher`, async () => {
                            expect(affectingEvent.affectsDepartment2).toBeFalsy();
                            const gbjbResult = await request(app)
                                .get(`${API_URL}/user/${VWZ.id}/affected-event-ids?semesterId=${semester.id}`)
                                .set('authorization', JSON.stringify({ email: VWZ.email }));
                            expect(gbjbResult.statusCode).toEqual(200);
                            expect(gbjbResult.body).toHaveLength(1);
                            expect(gbjbResult.body).toEqual([affectingEvent.id]);
    
                            const gbslResult = await request(app)
                                .get(`${API_URL}/user/${hij.id}/affected-event-ids?semesterId=${semester.id}`)
                                .set('authorization', JSON.stringify({ email: hij.email }));
                            expect(gbslResult.statusCode).toEqual(200);
                            expect(gbslResult.body).toHaveLength(0);
                        });
                    });
                    describe('affectsDepartment2: true', () => {
                        beforeAll(() => {
                            affectsDepartment2 = true;
                        });
                        it(`displays the event only gbjb and gbsl teachers`, async () => {
                            expect(affectingEvent.affectsDepartment2).toBeTruthy();
                            const gbjbResult = await request(app)
                                .get(`${API_URL}/user/${VWZ.id}/affected-event-ids?semesterId=${semester.id}`)
                                .set('authorization', JSON.stringify({ email: VWZ.email }));
                            expect(gbjbResult.statusCode).toEqual(200);
                            expect(gbjbResult.body).toHaveLength(1);
                            expect(gbjbResult.body).toEqual([affectingEvent.id]);
    
                            const gbslResult = await request(app)
                                .get(`${API_URL}/user/${hij.id}/affected-event-ids?semesterId=${semester.id}`)
                                .set('authorization', JSON.stringify({ email: hij.email }));
                            expect(gbslResult.statusCode).toEqual(200);
                            expect(gbslResult.body).toHaveLength(1);
                            expect(gbslResult.body).toEqual([affectingEvent.id]);
                        });
                    });
                })
                describe('audience: STUDENTS', () => {
                    beforeAll(() => {
                        audience = EventAudience.STUDENTS;
                        day = 'Mi';
                    });
                    describe('affectsDepartment2: false', () => {
                        beforeAll(() => {
                            affectsDepartment2 = false;
                        });
                        it(`displays the event for for gbsl and gbjb teacher, since both hav affected lessons`, async () => {
                            const gbjbResult = await request(app)
                                .get(`${API_URL}/user/${VWZ.id}/affected-event-ids?semesterId=${semester.id}`)
                                .set('authorization', JSON.stringify({ email: VWZ.email }));
                            expect(gbjbResult.statusCode).toEqual(200);
                            expect(gbjbResult.body).toHaveLength(1);
                            expect(gbjbResult.body).toEqual([affectingEvent.id]);
    
                            const gbslResult = await request(app)
                                .get(`${API_URL}/user/${hij.id}/affected-event-ids?semesterId=${semester.id}`)
                                .set('authorization', JSON.stringify({ email: hij.email }));
                            expect(gbslResult.statusCode).toEqual(200);
                            expect(gbslResult.body).toHaveLength(1);
                            expect(gbslResult.body).toEqual([affectingEvent.id]);
                        });
                    });
                    describe('affectsDepartment2: true', () => {
                        beforeAll(() => {
                            affectsDepartment2 = true;
                        });
                        it(`displays the event only gbjb and gbsl teachers`, async () => {
                            const gbjbResult = await request(app)
                                .get(`${API_URL}/user/${VWZ.id}/affected-event-ids?semesterId=${semester.id}`)
                                .set('authorization', JSON.stringify({ email: VWZ.email }));
                            expect(gbjbResult.statusCode).toEqual(200);
                            expect(gbjbResult.body).toHaveLength(1);
                            expect(gbjbResult.body).toEqual([affectingEvent.id]);
    
                            const gbslResult = await request(app)
                                .get(`${API_URL}/user/${hij.id}/affected-event-ids?semesterId=${semester.id}`)
                                .set('authorization', JSON.stringify({ email: hij.email }));
                            expect(gbslResult.statusCode).toEqual(200);
                            expect(gbslResult.body).toHaveLength(1);
                            expect(gbslResult.body).toEqual([affectingEvent.id]);
                        });
                    });
                })
                describe('audience: KLP', () => {
                    beforeAll(() => {
                        audience = EventAudience.KLP;
                        day = 'Do';
                    });
                    describe('affectsDepartment2: false', () => {
                        beforeAll(() => {
                            affectsDepartment2 = false;
                        });
                        it(`displays the event for for gbsl and gbjb teacher, since both hav affected lessons`, async () => {
                            const klpResult = await request(app)
                                .get(`${API_URL}/user/${klp.id}/affected-event-ids?semesterId=${semester.id}`)
                                .set('authorization', JSON.stringify({ email: klp.email }));
                            expect(klpResult.statusCode).toEqual(200);
                            expect(klpResult.body).toHaveLength(1);
                            expect(klpResult.body).toEqual([affectingEvent.id]);
    
                            const gbslResult = await request(app)
                                .get(`${API_URL}/user/${hij.id}/affected-event-ids?semesterId=${semester.id}`)
                                .set('authorization', JSON.stringify({ email: hij.email }));
                            expect(gbslResult.statusCode).toEqual(200);
                            expect(gbslResult.body).toHaveLength(0);

                            const gbjbResult = await request(app)
                                .get(`${API_URL}/user/${VWZ.id}/affected-event-ids?semesterId=${semester.id}`)
                                .set('authorization', JSON.stringify({ email: VWZ.email }));
                            expect(gbjbResult.statusCode).toEqual(200);
                            expect(gbjbResult.body).toHaveLength(0);
                        });
                    });
                    describe('affectsDepartment2: true', () => {
                        beforeAll(() => {
                            affectsDepartment2 = true;
                        });
                        it(`displays the event for for gbsl and gbjb teacher, since both hav affected lessons`, async () => {
                            const klpResult = await request(app)
                                .get(`${API_URL}/user/${klp.id}/affected-event-ids?semesterId=${semester.id}`)
                                .set('authorization', JSON.stringify({ email: klp.email }));
                            expect(klpResult.statusCode).toEqual(200);
                            expect(klpResult.body).toHaveLength(1);
                            expect(klpResult.body).toEqual([affectingEvent.id]);
    
                            const gbslResult = await request(app)
                                .get(`${API_URL}/user/${hij.id}/affected-event-ids?semesterId=${semester.id}`)
                                .set('authorization', JSON.stringify({ email: hij.email }));
                            expect(gbslResult.statusCode).toEqual(200);
                            expect(gbslResult.body).toHaveLength(0);

                            const gbjbResult = await request(app)
                                .get(`${API_URL}/user/${VWZ.id}/affected-event-ids?semesterId=${semester.id}`)
                                .set('authorization', JSON.stringify({ email: VWZ.email }));
                            expect(gbjbResult.statusCode).toEqual(200);
                            expect(gbjbResult.body).toHaveLength(0);
                        });
                    });
                })
            });
        })
        describe('selected by class', () => {
            let teachingAffected: TeachingAffected = TeachingAffected.YES;
            let author: User;
            let abc: User;
            let xyz: User;
            let affectingEvent: Event;
            beforeEach(async () => {
                author = await prisma.user.create({ data: generateUser() });
                abc = await prisma.user.create({ data: generateUser({ firstName: 'abc', untisId: untisTeachers.find(t => t.name === 'abc')!.id }) });
                affectingEvent = await prisma.event.create({
                    data: generateEvent({
                        authorId: author.id,
                        start: new Date('2023-10-18T08:00'), /* 18.10.2023 is a Mittwoch */
                        end: new Date('2023-10-18T12:00'),
                        state: EventState.PUBLISHED,
                        classes: ['26Ge'],
                        teachingAffected: teachingAffected,
                    })
                });
                xyz = await prisma.user.create({ data: generateUser({ firstName: 'xyz', untisId: untisTeachers.find(t => t.name === 'xyz')!.id }) });
                const dummyEventOfOtherClass = await prisma.event.create({
                    data: generateEvent({
                        authorId: author.id,
                        start: new Date('2023-10-18T08:00'), /* 18.10.2023 is a Mittwoch */
                        end: new Date('2023-10-18T12:00'),
                        state: EventState.PUBLISHED,
                        classes: ['24Ga'],
                        teachingAffected: TeachingAffected.YES,
                    })
                });
            });
            describe('teaching affected: YES', () => {
                beforeAll(() => {
                    teachingAffected = TeachingAffected.YES;
                });
                it('respects field', async () => {
                    /**
                     * 2 events, one affects the lesson of abc, but not the lesson of xyz
                     * 
                     * abc -> one affected event
                     * xyz -> zero affected events
                     */
                    const resultAbc = await request(app)
                        .get(`${API_URL}/user/${abc.id}/affected-event-ids?semesterId=${semester.id}`)
                        .set('authorization', JSON.stringify({ email: abc.email }));
                    expect(resultAbc.statusCode).toEqual(200);
                    expect(resultAbc.body).toHaveLength(1);
                    expect(resultAbc.body).toEqual([affectingEvent.id]);

                    const resultXyz = await request(app)
                        .get(`${API_URL}/user/${xyz.id}/affected-event-ids?semesterId=${semester.id}`)
                        .set('authorization', JSON.stringify({ email: xyz.email }));
                    expect(resultXyz.statusCode).toEqual(200);
                    expect(resultXyz.body).toHaveLength(0);
                });
            });
            describe('teaching affected: NO', () => {
                beforeAll(() => {
                    teachingAffected = TeachingAffected.NO;
                });
                it('respects field', async () => {
                    /**
                     * 1 event with "teachingAffected=false" during a lesson of abc, is displayed
                     * abc -> one affected event
                     */
                    const resultAbc = await request(app)
                        .get(`${API_URL}/user/${abc.id}/affected-event-ids?semesterId=${semester.id}`)
                        .set('authorization', JSON.stringify({ email: abc.email }));
                    expect(resultAbc.statusCode).toEqual(200);
                    expect(resultAbc.body).toHaveLength(1);
                    expect(resultAbc.body).toEqual([affectingEvent.id]);
                });
            })
            describe('teaching affected: PARTIAL', () => {
                beforeAll(() => {
                    teachingAffected = TeachingAffected.PARTIAL;
                });
                it('respects field', async () => {
                    /**
                     * 1 event that is during a lesson of abc, and affects the teaching partially
                     * abc -> one affected event
                     */
                    const resultAbc = await request(app)
                        .get(`${API_URL}/user/${abc.id}/affected-event-ids?semesterId=${semester.id}`)
                        .set('authorization', JSON.stringify({ email: abc.email }));
                    expect(resultAbc.statusCode).toEqual(200);
                    expect(resultAbc.body).toHaveLength(1);
                    expect(resultAbc.body).toEqual([affectingEvent.id]);
                });
            })
        });

        describe('selected by class group', () => {
            let classGroups: string[] = ['26G'];
            let author: User;
            let abc: User;
            let xyz: User;
            let hij: User;
            let affectingEvent: Event;
            beforeAll(() => {
                // add one more teacher and make xyz a teacher of a 26G class
                data.teachers.push({ name: 'hij', longName: 'Jimmy Hermann', sex: 'M' });
                data.subjects.push({ name: 'F', longName: 'Französisch' });
                data.classes.push({ name: '26a', sf: 'WR' });
                data.lessons.push({ subject: 'E', day: 'Do', teachers: ['xyz'], classes: ['26a'], start: 1120, end: 1205, room: 'D118' });
                data.lessons.push({ subject: 'F', day: 'Mo', teachers: ['hij'], classes: ['24i'], start: 1120, end: 1205, room: 'D112' })
            });
            afterAll(() => {
                data = _.cloneDeep(_data);
            });
            beforeEach(async () => {
                author = await prisma.user.create({ data: generateUser() });
                abc = await prisma.user.create({ data: generateUser({ untisId: untisTeachers.find(t => t.name === 'abc')!.id }) });
                xyz = await prisma.user.create({ data: generateUser({ untisId: untisTeachers.find(t => t.name === 'xyz')!.id }) });
                hij = await prisma.user.create({ data: generateUser({ untisId: untisTeachers.find(t => t.name === 'hij')!.id }) });
                affectingEvent = await prisma.event.create({
                    data: generateEvent({
                        authorId: author.id,
                        start: new Date('2023-10-18T08:00'), /* 18.10.2023 is a Mittwoch */
                        end: new Date('2023-10-18T12:00'),
                        state: EventState.PUBLISHED,
                        classGroups: classGroups,
                        audience: EventAudience.ALL
                    })
                });
            });
            it('returns the events for all teachers of a 26G class', async () => {
                const resultAbc = await request(app)
                    .get(`${API_URL}/user/${abc.id}/affected-event-ids?semesterId=${semester.id}`)
                    .set('authorization', JSON.stringify({ email: abc.email }));
                expect(resultAbc.statusCode).toEqual(200);
                expect(resultAbc.body).toHaveLength(1);
                expect(resultAbc.body).toEqual([affectingEvent.id]);

                const resultXyz = await request(app)
                    .get(`${API_URL}/user/${xyz.id}/affected-event-ids?semesterId=${semester.id}`)
                    .set('authorization', JSON.stringify({ email: xyz.email }));
                expect(resultXyz.statusCode).toEqual(200);
                expect(resultXyz.body).toHaveLength(1);
                expect(resultXyz.body).toEqual([affectingEvent.id]);

                const resultHij = await request(app)
                    .get(`${API_URL}/user/${hij.id}/affected-event-ids?semesterId=${semester.id}`)
                    .set('authorization', JSON.stringify({ email: hij.email }));
                expect(resultHij.statusCode).toEqual(200);
                expect(resultHij.body).toHaveLength(0);
            });

        });

        describe('filtered by audience', () => {
            let audience: EventAudience = EventAudience.ALL;
            let author: User;
            let abc: User;
            let xyz: User;
            let affectingEvent: Event;
            beforeEach(async () => {
                author = await prisma.user.create({ data: generateUser() });
                abc = await prisma.user.create({ data: generateUser({ firstName: 'abc', untisId: untisTeachers.find(t => t.name === 'abc')!.id }) });
                xyz = await prisma.user.create({ data: generateUser({ firstName: 'xyz', untisId: untisTeachers.find(t => t.name === 'xyz')!.id }) });
                affectingEvent = await prisma.event.create({
                    data: generateEvent({
                        authorId: author.id,
                        start: new Date('2023-10-18T08:00'), /* 18.10.2023 is a Mittwoch */
                        end: new Date('2023-10-18T12:00'),
                        state: EventState.PUBLISHED,
                        classes: ['26Ge'],
                        audience: audience
                    })
                });
            });
            describe('audience: ALL', () => {
                beforeAll(() => {
                    audience = EventAudience.ALL;
                });
                afterEach(() => {
                    data = _.cloneDeep(_data);
                });
                describe('does list the event for teachers of the class team 26Ge', () => {
                    let hij: User;
                    beforeEach(async () => {
                        // xyz teaches the class on a different day
                        data.lessons.push({ subject: 'E', day: 'Do', teachers: ['xyz'], classes: ['26e'], start: 825, end: 910, room: 'D113' });
                        // hij does not teach the class...
                        data.teachers.push({ name: 'hij', longName: 'Jimmy Hermann', sex: 'M' });
                        data.subjects.push({ name: 'F', longName: 'Französisch' });
                        data.classes.push({ name: '26a', sf: 'WR' });
                        data.lessons.push({ subject: 'F', day: 'Mo', teachers: ['hij'], classes: ['26a'], start: 1120, end: 1205, room: 'D112' });
                        await syncUntis2DB(semester!.id, (sem: Semester) => fetchUntis(sem, generateUntisData(data)));
                        const untisHij = await prisma.untisTeacher.findUnique({ where: { name: 'hij' } });
                        hij = await prisma.user.create({ data: generateUser({ firstName: 'hij', untisId: untisHij!.id }) });
                    });
                    ['xyz', 'abc'].forEach(async (name: string) => {
                        it(`displays the event for ${name}`, async () => {
                            const user = (await prisma.user.findFirst({ where: { firstName: name }, include: { untis: { include: { classes: true } } } }))!;
                            expect(user.untis!.classes.map(c => c.name)).toContain('26Ge');
                            const result = await request(app)
                                .get(`${API_URL}/user/${user.id}/affected-event-ids?semesterId=${semester.id}`)
                                .set('authorization', JSON.stringify({ email: user.email }));
                            expect(result.statusCode).toEqual(200);
                            expect(result.body).toHaveLength(1);
                            expect(result.body).toEqual([affectingEvent.id]);
                        })
                    });
                    ['hij'].forEach(async (name: string) => {
                        it(`does not display non-class team member ${name}`, async () => {
                            const user = (await prisma.user.findFirst({ where: { firstName: name }, include: { untis: { include: { classes: true } } } }))!;
                            expect(user.untis!.classes.map(c => c.name)).not.toContain('26Ge');
                            const result = await request(app)
                                .get(`${API_URL}/user/${user.id}/affected-event-ids?semesterId=${semester.id}`)
                                .set('authorization', JSON.stringify({ email: user.email }));
                            expect(result.statusCode).toEqual(200);
                            expect(result.body).toHaveLength(0);
                        })
                    });
                })
            });

            describe('audience: KLP', () => {
                beforeAll(() => {
                    audience = EventAudience.KLP;
                });
                afterAll(() => {
                    data = _.cloneDeep(_data);
                });
                it('does not list the event for non-klp teachers', async () => {
                    const resultAbc = await request(app)
                        .get(`${API_URL}/user/${abc.id}/affected-event-ids?semesterId=${semester.id}`)
                        .set('authorization', JSON.stringify({ email: abc.email }));
                    expect(resultAbc.statusCode).toEqual(200);
                    expect(resultAbc.body).toHaveLength(0);
                });
                describe('does list the event for the KLP of the class 26Ge', () => {
                    let thisData: UntisDataProps;
                    beforeAll(async () => {
                        data.subjects.push({ name: 'KS', longName: 'Klassenstunde' });
                        // abc is KLP of 26Ge
                        data.lessons.push({ subject: 'KS', day: 'Do', teachers: ['abc'], classes: ['26e'], start: 1120, end: 1205, room: 'D114' });
                        // xyz is KLP of 24i
                        data.lessons.push({ subject: 'KS', day: 'Do', teachers: ['xyz'], classes: ['24i'], start: 1120, end: 1205, room: 'D115' });
                        // xyz teaches the class within the event
                        data.lessons.push({ subject: 'E', day: 'Mi', teachers: ['xyz'], classes: ['26e'], start: 1120, end: 1205, room: 'D113' });
                        // hij does not teach the class...
                        data.teachers.push({ name: 'hij', longName: 'Jimmy Hermann', sex: 'M' });
                        data.subjects.push({ name: 'F', longName: 'Französisch' });
                        data.classes.push({ name: '26a', sf: 'WR' });
                        data.lessons.push({ subject: 'F', day: 'Mo', teachers: ['hij'], classes: ['26a'], start: 1120, end: 1205, room: 'D112' });
                        thisData = _.cloneDeep(data);
                    });
                    beforeEach(async () => {
                        await prisma.user.create({ data: generateUser({ firstName: 'hij', untisId: untisTeachers.find(t => t.name === 'hij')!.id }) });
                    });
                    afterEach(() => {
                        data = _.cloneDeep(thisData);
                    });
                    afterAll(() => {
                        data = _.cloneDeep(_data);
                    });
                    ['abc'].forEach(async (name: string) => {
                        it(`displays the event for ${name}`, async () => {
                            const user = (await prisma.user.findFirst({ where: { firstName: name }, include: { untis: { include: { classes: true } } } }))!;
                            expect(user.untis!.classes.map(c => c.name)).toContain('26Ge');
                            const result = await request(app)
                                .get(`${API_URL}/user/${user.id}/affected-event-ids?semesterId=${semester.id}`)
                                .set('authorization', JSON.stringify({ email: user.email }));
                            expect(result.statusCode).toEqual(200);
                            expect(result.body).toHaveLength(1);
                            expect(result.body).toEqual([affectingEvent.id]);
                        })
                    });
                    ['xyz', 'hij'].forEach(async (name: string) => {
                        it(`does not display for others (here: ${name}) except klp[abc] of 26Ge`, async () => {
                            // await prisma.user.create({ data: generateUser({firstName: 'hij', untisId: untisTeachers.find(t => t.name === 'hij')!.id }) });

                            const user = (await prisma.user.findFirst({ where: { firstName: name }, include: { untis: { include: { classes: true } } } }))!;
                            if (name === 'xyz') {
                                expect(user.untis!.classes.map(c => c.name)).toContain('26Ge');
                            } else {
                                expect(user.untis!.classes.map(c => c.name)).not.toContain('26Ge');
                            }
                            const result = await request(app)
                                .get(`${API_URL}/user/${user.id}/affected-event-ids?semesterId=${semester.id}`)
                                .set('authorization', JSON.stringify({ email: user.email }));
                            expect(result.statusCode).toEqual(200);
                            expect(result.body).toHaveLength(0);
                        })
                    });
                    it('lists klp events when no lesson of klp is affected', async () => {
                        const other = await prisma.event.create({
                            data: generateEvent({
                                authorId: author.id,
                                start: new Date('2023-10-18T20:00'), /* 18.10.2023 is a Mittwoch */
                                end: new Date('2023-10-18T21:30'),
                                description: 'Elternabend',
                                state: EventState.PUBLISHED,
                                classes: ['26Ge'],
                                audience: EventAudience.KLP
                            })
                        });
                        const user = (await prisma.user.findFirst({ where: { firstName: 'abc' }, include: { untis: { include: { classes: true } } } }))!;
                        expect(user.untis!.classes.map(c => c.name)).toContain('26Ge');
                        const result = await request(app)
                            .get(`${API_URL}/user/${user.id}/affected-event-ids?semesterId=${semester.id}`)
                            .set('authorization', JSON.stringify({ email: user.email }));
                        expect(result.statusCode).toEqual(200);
                        expect(result.body).toHaveLength(2);
                        expect(result.body.sort()).toEqual([affectingEvent.id, other.id].sort());
                    })

                })
            });

            describe('audience: STUDENTS', () => {
                beforeAll(() => {
                    audience = EventAudience.STUDENTS;
                });
                afterAll(() => {
                    data = _.cloneDeep(_data);
                });
                describe('does list the event for the KLP and affected LPs of the class 26Ge', () => {
                    let thisData: UntisDataProps;
                    let infoElternabend: Event;
                    beforeAll(async () => {
                        data.subjects.push({ name: 'KS', longName: 'Klassenstunde' });
                        // abc is KLP of 26Ge
                        data.lessons.push({ subject: 'KS', day: 'Do', teachers: ['abc'], classes: ['26e'], start: 1120, end: 1205, room: 'D114' });
                        // xyz teaches the class within the event
                        data.lessons.push({ subject: 'E', day: 'Mi', teachers: ['xyz'], classes: ['26e'], start: 1120, end: 1205, room: 'D113' });
                        // hij does teach the class, but not within the event...
                        data.teachers.push({ name: 'hij', longName: 'Jimmy Hermann', sex: 'M' });
                        data.subjects.push({ name: 'F', longName: 'Französisch' });
                        data.lessons.push({ subject: 'F', day: 'Mo', teachers: ['hij'], classes: ['26e'], start: 1120, end: 1205, room: 'D112' });
                        thisData = _.cloneDeep(data);
                    });
                    beforeEach(async () => {
                        await prisma.user.create({ data: generateUser({ firstName: 'hij', untisId: untisTeachers.find(t => t.name === 'hij')!.id }) });
                        /* add a second event for 26Ge, that does not affect lessons */
                        infoElternabend = await prisma.event.create({
                            data: generateEvent({
                                authorId: author.id,
                                start: new Date('2023-10-18T20:00'), /* 18.10.2023 is a Mittwoch */
                                end: new Date('2023-10-18T21:30'),
                                description: 'Informations-Elternabend',
                                state: EventState.PUBLISHED,
                                classes: ['26Ge'],
                                audience: EventAudience.STUDENTS
                            })
                        });
                    });
                    afterEach(() => {
                        data = _.cloneDeep(thisData);
                    });
                    afterAll(() => {
                        data = _.cloneDeep(_data);
                    });
                    ['abc', 'xyz'].forEach(async (name: string) => {
                        it(`displays the event for ${name}`, async () => {
                            const user = (await prisma.user.findFirst({ where: { firstName: name }, include: { untis: { include: { classes: true, lessons: true } } } }))!;
                            expect(user.untis!.classes.map(c => c.name)).toContain('26Ge');
                            const result = await request(app)
                                .get(`${API_URL}/user/${user.id}/affected-event-ids?semesterId=${semester.id}`)
                                .set('authorization', JSON.stringify({ email: user.email }));
                            expect(result.statusCode).toEqual(200);
                            if (name === 'abc') { /* KLP */
                                expect(result.body).toHaveLength(2);
                                expect(result.body.sort()).toEqual([infoElternabend.id, affectingEvent.id].sort());
                            } else {
                                expect(result.body).toHaveLength(1);
                                expect(result.body).toEqual([affectingEvent.id]);
                            }
                        })
                    });
                    /* hij does not teach the class during the event */
                    ['hij'].forEach(async (name: string) => {
                        it(`does not display for ${name}`, async () => {
                            const user = (await prisma.user.findFirst({ where: { firstName: name }, include: { untis: { include: { classes: true } } } }))!;
                            expect(user.untis!.classes.map(c => c.name)).toContain('26Ge');
                            const result = await request(app)
                                .get(`${API_URL}/user/${user.id}/affected-event-ids?semesterId=${semester.id}`)
                                .set('authorization', JSON.stringify({ email: user.email }));
                            expect(result.statusCode).toEqual(200);
                            expect(result.body).toHaveLength(0);
                        })
                    });
                })
            });

            describe('audience: LP', () => {
                beforeAll(() => {
                    audience = EventAudience.LP;
                });
                afterEach(() => {
                    data = _.cloneDeep(_data);
                });
                describe('does list the event for teachers of the class team 26Ge', () => {
                    beforeEach(async () => {
                        // xyz teaches the class on a different day
                        data.lessons.push({ subject: 'E', day: 'Do', teachers: ['xyz'], classes: ['26e'], start: 825, end: 910, room: 'D113' });
                        // hij does not teach the class...
                        data.teachers.push({ name: 'hij', longName: 'Jimmy Hermann', sex: 'M' });
                        data.subjects.push({ name: 'F', longName: 'Französisch' });
                        data.classes.push({ name: '26a', sf: 'WR' });
                        data.lessons.push({ subject: 'F', day: 'Mo', teachers: ['hij'], classes: ['26a'], start: 1120, end: 1205, room: 'D112' });
                        await syncUntis2DB(semester!.id, (sem: Semester) => fetchUntis(sem, generateUntisData(data)));
                        const untisHij = await prisma.untisTeacher.findUnique({ where: { name: 'hij' } });
                        await prisma.user.create({ data: generateUser({ firstName: 'hij', untisId: untisHij!.id }) });
                    });
                    ['xyz', 'abc'].forEach(async (name: string) => {
                        it(`displays the event for ${name}`, async () => {
                            const user = (await prisma.user.findFirst({ where: { firstName: name }, include: { untis: { include: { classes: true } } } }))!;
                            expect(user.untis!.classes.map(c => c.name)).toContain('26Ge');
                            const result = await request(app)
                                .get(`${API_URL}/user/${user.id}/affected-event-ids?semesterId=${semester.id}`)
                                .set('authorization', JSON.stringify({ email: user.email }));
                            expect(result.statusCode).toEqual(200);
                            expect(result.body).toHaveLength(1);
                            expect(result.body).toEqual([affectingEvent.id]);
                        })
                    });
                    ['hij'].forEach(async (name: string) => {
                        it(`does not display non-class team member ${name}`, async () => {
                            const user = (await prisma.user.findFirst({ where: { firstName: name }, include: { untis: { include: { classes: true } } } }))!;
                            expect(user.untis!.classes.map(c => c.name)).not.toContain('26Ge');
                            const result = await request(app)
                                .get(`${API_URL}/user/${user.id}/affected-event-ids?semesterId=${semester.id}`)
                                .set('authorization', JSON.stringify({ email: user.email }));
                            expect(result.statusCode).toEqual(200);
                            expect(result.body).toHaveLength(0);
                        })
                    });

                })
            });
        });
    });
});

