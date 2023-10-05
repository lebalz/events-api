import request from 'supertest';
import { truncate } from "./helpers/db";
import prisma from '../../src/prisma';
import app, { API_URL } from '../../src/app';
import { generateUser, userSequence } from '../factories/user';
import { EventState, Role, TeachingAffected, User } from '@prisma/client';
import { generateUntisTeacher } from '../factories/untisTeacher';
import { generateEvent } from '../factories/event';
import { generateSemester } from '../factories/semester';
import { generateDepartment } from '../factories/department';
import { generateUntisClass } from '../factories/untisClass';
import { generateUntisLesson } from '../factories/untisLesson';
import { existsSync, readFile, readFileSync } from 'fs';
import { createEvent, createEvents } from 'ics';
import { prepareEvent } from '../../src/services/createIcs';
import { notify } from '../../src/middlewares/notify.nop';

jest.mock('../../src/middlewares/notify.nop');
const mNotification = <jest.Mock<typeof notify>>notify;

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


describe(`GET ${API_URL}/user/all`, () => {
    afterEach(() => {
        return truncate();
    });
    it('rejects unauthorized users', async () => {
        const result = await request(app)
            .get(`${API_URL}/user/all`)
            .set('authorization', JSON.stringify({ noAuth: true }));
        expect(result.statusCode).toEqual(401);
    });
    it('returns all users', async () => {
        const user = await prisma.user.create({
            data: generateUser({email: 'foo@bar.ch'})
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



describe(`POST ${API_URL}/user/:id/create_ics`, () => {
    afterEach(() => {
        return truncate();
    });
    it('can create an ics for the users calendar', async () => {
        const sem = await prisma.semester.create({
            data: generateSemester({
                start: new Date(), 
                end: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7 * 4 * 6)
        })});
        const department = await prisma.department.create({data: generateDepartment({classLetters: ['h'], letter: 'G'})});
        const teacher = await prisma.untisTeacher.create({data: generateUntisTeacher()});
        const klass = await prisma.untisClass.create({data: {
            ...generateUntisClass({departmentId: department.id, name: '25Gh'}),
            teachers: {
                connect: {
                    id: teacher.id
                }
            }
        }});
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
            data: generateUser({email: 'foo@bar.ch', untisId: teacher.id})
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
                start: new Date(),
                end: new Date(Date.now() + 1000 * 60 * 60),
            })
        });

        const result = await request(app)
            .post(`${API_URL}/user/${user.id}/create_ics`)
            .set('authorization', JSON.stringify({email: user.email}));
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
    });
});

describe(`POST ${API_URL}/user/:id/set_role`, () => {
    afterEach(() => {
        return truncate();
    });
    it('user can not set role of self', async () => {
        const user = await prisma.user.create({
            data: generateUser({email: 'foo@bar.ch'})
        });
        const result = await request(app)
            .put(`${API_URL}/user/${user.id}/set_role`)
            .set('authorization', JSON.stringify({email: user.email}))
            .send({ data: { role: Role.ADMIN } });
        expect(result.statusCode).toEqual(403);
    });
    it('admin can set role of self', async () => {
        const admin = await prisma.user.create({
            data: generateUser({email: 'admin@bar.ch', role: Role.ADMIN})
        });
        const result = await request(app)
            .put(`${API_URL}/user/${admin.id}/set_role`)
            .set('authorization', JSON.stringify({email: admin.email}))
            .send({ data: { role: Role.USER } });
        expect(result.statusCode).toEqual(200);
        expect(result.body).toEqual({
            ...prepareUser(admin),
            role: Role.USER,
            updatedAt: expect.any(String)
        });
    });
    it('admin can grant a user admin privileges', async () => {
        const user = await prisma.user.create({
            data: generateUser({email: 'foo@bar.ch'})
        });
        const admin = await prisma.user.create({
            data: generateUser({email: 'admin@bar.ch', role: Role.ADMIN})
        });
        const result = await request(app)
            .put(`${API_URL}/user/${user.id}/set_role`)
            .set('authorization', JSON.stringify({email: admin.email}))
            .send({ data: { role: Role.ADMIN } });
        expect(result.statusCode).toEqual(200);
        expect(result.body).toEqual({
            ...prepareUser(user),
            role: Role.ADMIN,
            updatedAt: expect.any(String)
        });
    });
    it('admin can revoke admin privileges', async () => {
        const user = await prisma.user.create({
            data: generateUser({email: 'foo@bar.ch', role: Role.ADMIN})
        });
        const admin = await prisma.user.create({
            data: generateUser({email: 'admin@bar.ch', role: Role.ADMIN})
        });
        const result = await request(app)
            .put(`${API_URL}/user/${user.id}/set_role`)
            .set('authorization', JSON.stringify({email: admin.email}))
            .send({ data: { role: Role.USER } });
        expect(result.statusCode).toEqual(200);
        expect(result.body).toEqual({
            ...prepareUser(user),
            role: Role.USER,
            updatedAt: expect.any(String)
        });
    });
});