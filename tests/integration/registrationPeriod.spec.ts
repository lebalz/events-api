import request from 'supertest';
import app, { API_URL } from '../../src/app';
import prisma from '../../src/prisma';
import { generateUser } from '../factories/user';
import { generateImportJob, generateSyncJob, jobSequence } from '../factories/job';
import { truncate } from './helpers/db';
import { Department, EventState, Job, JobState, JobType, RegistrationPeriod, Role } from '@prisma/client';
import { eventSequence } from '../factories/event';
import _ from 'lodash';
import { notify } from '../../src/middlewares/notify.nop';
import { IoEvent } from '../../src/routes/socketEventTypes';
import { faker } from '@faker-js/faker';
import { HTTP401Error } from '../../src/utils/errors/Errors';

jest.mock('../../src/middlewares/notify.nop');
const mNotification = <jest.Mock<typeof notify>>notify;

const prepareRegistrationPeriod = (regPeriod: RegistrationPeriod) => {
    return {
        ...JSON.parse(JSON.stringify(regPeriod))
    }
}

beforeEach(async () => {
    await prisma.registrationPeriod.createMany({
        data: [
            {
                start: new Date('2023-03-01'),
                end: new Date('2023-06-28'),
                name: 'HS2023'
            },
            {
                start: new Date('2023-08-23'),
                end: new Date('2023-12-23'),
                name: 'FS2024'
            }
        ]
    });
});


afterEach(() => {
    return truncate();
});

describe(`GET ${API_URL}/registration_period/all`, () => {
    it("is not for public users", async () => {
        const regPeriods = await prisma.registrationPeriod.findMany();
        const result = await request(app)
            .get(`${API_URL}/registration_period/all`);
        expect(result.statusCode).toEqual(401);
    });
    it("returns all registration periods for users", async () => {
        const regPeriods = await prisma.registrationPeriod.findMany();
        const user = await prisma.user.create({data: generateUser({})});

        const result = await request(app)
            .get(`${API_URL}/registration_period/all`)
            .set('authorization', JSON.stringify({email: user.email}));
        expect(result.statusCode).toEqual(200);
        expect(result.body.length).toEqual(2);
        expect(result.body.map((d: RegistrationPeriod) => d.id).sort()).toEqual(regPeriods.map(d => d.id).sort());
        expect(mNotification).toHaveBeenCalledTimes(0);
    });
});

describe(`GET ${API_URL}/registration_period/:id`, () => {
    it("prevents public user to get department", async () => {
        const semetser = await prisma.registrationPeriod.findFirst();
        const result = await request(app)
            .get(`${API_URL}/registration_period/${semetser!.id}`);
        expect(result.statusCode).toEqual(401);
        expect(mNotification).toHaveBeenCalledTimes(0);
    });
    it("can get department by id", async () => {
        const user = await prisma.user.create({data: generateUser({})});
        const regPeriod = await prisma.registrationPeriod.findFirst();
        const result = await request(app)
            .get(`${API_URL}/registration_period/${regPeriod!.id}`)
            .set('authorization', JSON.stringify({email: user.email}));
        expect(result.statusCode).toEqual(200);
        expect(result.body).toEqual(prepareRegistrationPeriod(regPeriod!));
        expect(mNotification).toHaveBeenCalledTimes(0);
    });
});
describe(`PUT ${API_URL}/registration_period/:id`, () => {
    it("prevents user to update Registration Period", async () => {
        const user = await prisma.user.create({data: generateUser({})});
        const dep = await prisma.registrationPeriod.findFirst();
        const result = await request(app)
            .put(`${API_URL}/registration_period/${dep!.id}`)
            .set('authorization', JSON.stringify({email: user.email}))
            .send({data: {name: 'FOO'}});
        expect(result.statusCode).toEqual(403);
        expect(mNotification).toHaveBeenCalledTimes(0);
    });
    it("lets admins update Registration Period", async () => {
        const admin = await prisma.user.create({data: generateUser({role: Role.ADMIN})});
        const regPeriod = await prisma.registrationPeriod.findFirst();
        const result = await request(app)
            .put(`${API_URL}/registration_period/${regPeriod!.id}`)
            .set('authorization', JSON.stringify({email: admin.email}))
            .send({data: {name: 'FOO'}});
        expect(result.statusCode).toEqual(200);
        expect(result.body).toEqual({
            ...prepareRegistrationPeriod(regPeriod!),
            name: 'FOO',
            updatedAt: expect.any(String)
        });
        expect(mNotification).toHaveBeenCalledTimes(1);
        expect(mNotification.mock.calls[0][0]).toEqual({
            event: IoEvent.CHANGED_RECORD,
            message: { record: 'REGISTRATION_PERIOD', id: regPeriod!.id },
            to: 'all'
        });
    });

    it("can not update start Date to be later than the end date", async () => {
        const regPeriod = await prisma.registrationPeriod.findFirst();
        const admin = await prisma.user.create({data: generateUser({role: Role.ADMIN})});

        const result = await request(app)
            .put(`${API_URL}/registration_period/${regPeriod!.id}`)
            .set('authorization', JSON.stringify({email: admin.email}))
            .send({data: { start: faker.date.future({refDate: regPeriod!.end})}});
        expect(result.statusCode).toEqual(400);
        expect(mNotification).toHaveBeenCalledTimes(0);
    });
    it("can not update end Date to be earlier than the start date", async () => {
        const regPeriod = await prisma.registrationPeriod.findFirst();
        const admin = await prisma.user.create({data: generateUser({role: Role.ADMIN})});

        const result = await request(app)
            .put(`${API_URL}/registration_period/${regPeriod!.id}`)
            .set('authorization', JSON.stringify({email: admin.email}))
            .send({data: { end: faker.date.past({refDate: regPeriod?.start})}});
        expect(result.statusCode).toEqual(400);
        expect(mNotification).toHaveBeenCalledTimes(0);
    });
});

describe(`POST ${API_URL}/registration_period`, () => {
    it("prevents user to create a regPeriod", async () => {
        const user = await prisma.user.create({data: generateUser({})});
        const result = await request(app)
            .post(`${API_URL}/registration_period`)
            .set('authorization', JSON.stringify({email: user.email}))
            .send({name: 'FOO', description: 'BAR'});
        expect(result.statusCode).toEqual(403);
        expect(mNotification).toHaveBeenCalledTimes(0);
    });
    it("admin can create a new Regitration Period", async () => {
        const admin = await prisma.user.create({data: generateUser({role: Role.ADMIN})});
        const start = faker.date.soon();
        const end = faker.date.future({refDate: start});
        const result = await request(app)
            .post(`${API_URL}/registration_period`)
            .set('authorization', JSON.stringify({email: admin.email}))
            .send({name: 'FOO', start: start, end: end });
        expect(result.statusCode).toEqual(201);
        expect(result.body.name).toEqual('FOO');
        expect(result.body.start).toEqual(start.toISOString());
        expect(result.body.end).toEqual(end.toISOString());

        expect(mNotification).toHaveBeenCalledTimes(1);
        expect(mNotification.mock.calls[0][0]).toEqual({
            event: IoEvent.NEW_RECORD,
            message: { record: 'REGISTRATION_PERIOD', id: result.body.id },
            to: 'all'
        });
    });
});

describe(`DELETE ${API_URL}/registration_period/:id`, () => {
    it("prevents user to delete a department", async () => {
        const regPeriod = await prisma.registrationPeriod.findFirst();
        const user = await prisma.user.create({data: generateUser({})});
        const result = await request(app)
            .delete(`${API_URL}/registration_period/${regPeriod!.id}`)
            .set('authorization', JSON.stringify({email: user.email}));
        expect(result.statusCode).toEqual(403);
        expect(mNotification).toHaveBeenCalledTimes(0);
    });
    it("admin can delete a Regitration Period", async () => {
        const admin = await prisma.user.create({data: generateUser({role: Role.ADMIN})});
        const regPeriods = await prisma.registrationPeriod.findMany();
        expect(regPeriods).toHaveLength(2);
        const regPeriod = regPeriods[0];
        const result = await request(app)
            .delete(`${API_URL}/registration_period/${regPeriod!.id}`)
            .set('authorization', JSON.stringify({email: admin.email}));
        expect(result.statusCode).toEqual(204);
        const regPeriodsAfter = await prisma.registrationPeriod.findMany();
        expect(regPeriodsAfter).toHaveLength(1);
        expect(regPeriodsAfter.map(d => d.id)).not.toContain(regPeriod!.id);
        expect(mNotification).toHaveBeenCalledTimes(1);
        expect(mNotification.mock.calls[0][0]).toEqual({
            event: IoEvent.DELETED_RECORD,
            message: { record: 'REGISTRATION_PERIOD', id: regPeriod!.id },
            to: 'all'
        });
    });
});


describe(`POST ${API_URL}/registration_period/:id/sync_untis`, () => {
    it("prevents user to sync with untis", async () => {
        const regPeriod = await prisma.registrationPeriod.findFirst();
        const user = await prisma.user.create({data: generateUser({})});
        const result = await request(app)
            .post(`${API_URL}/registration_period/${regPeriod!.id}/sync_untis`)
            .set('authorization', JSON.stringify({email: user.email}));
        expect(result.statusCode).toEqual(403);
        expect(mNotification).toHaveBeenCalledTimes(0);
    });
});