import request from 'supertest';
import prisma from '../../src/prisma';
import app, { API_URL } from '../../src/app';
import { prepareUser as apiPrepareUser } from '../../src/models/user.helpers';
import { generateUser, userSequence } from '../factories/user';
import {
    Department,
    Event,
    EventAudience,
    EventState,
    Role,
    Semester,
    TeachingAffected,
    UntisTeacher,
    User
} from '@prisma/client';
import { generateUntisTeacher } from '../factories/untisTeacher';
import { eventSequence, generateEvent } from '../factories/event';
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
import { withoutDTSTAMP } from '../unit/__tests__/services.test';
import { prepareRecord } from '../helpers/prepareRecord';
import { ApiSubscription, DEFAULT_INCLUDE, prepareSubscription } from '../../src/models/subscription.helpers';
import { generateSubscription } from '../factories/subscription';
import exp from 'constants';

jest.mock('../../src/middlewares/notify.nop');
const mNotification = <jest.Mock<typeof notify>>notify;

describe(`PUT ${API_URL}/subscriptions/:id`, () => {
    it('can update subscriptions', async () => {
        const user = await prisma.user.create({
            data: generateUser({ email: 'foo@bar.ch' })
        });
        const subscription = await prisma.subscription.create({
            data: generateSubscription({ userId: user.id })
        });

        const result = await request(app)
            .put(`${API_URL}/subscriptions/${subscription.id}`)
            .set('authorization', JSON.stringify({ email: user.email }))
            .send({ data: { subscribeToAffected: false } });
        expect(result.statusCode).toEqual(200);
        const expected = {
            ...prepareSubscription({ ...subscription, departments: [], untisClasses: [], ignoredEvents: [] }),
            subscribeToAffected: false,
            updatedAt: expect.any(String)
        };
        expect(result.body).toEqual({
            ...expected,
            createdAt: subscription.createdAt.toISOString()
        });
        expect(mNotification).toHaveBeenCalledTimes(1);
        expect(mNotification.mock.calls[0][0]).toEqual({
            event: IoEvent.CHANGED_RECORD,
            message: {
                type: 'SUBSCRIPTION',
                record: {
                    ...expected,
                    createdAt: subscription.createdAt,
                    updatedAt: expect.any(Date)
                }
            },
            to: user.id
        });
    });
});

describe(`POST ${API_URL}/subscriptions`, () => {
    it('can create a new subscription', async () => {
        const user = await prisma.user.create({
            data: generateUser({ email: 'foo@bar.ch' })
        });
        const all = await prisma.subscription.findMany();
        expect(all.length).toEqual(0);

        const result = await request(app)
            .post(`${API_URL}/subscriptions`)
            .set('authorization', JSON.stringify({ email: user.email }));
        expect(result.statusCode).toEqual(201);

        const expected = {
            subscribeToAffected: true,
            departmentIds: [],
            untisClassIds: [],
            ignoredEventIds: [],
            userId: user.id,
            icsLocator: expect.any(String),
            id: expect.any(String),
            updatedAt: expect.any(String),
            createdAt: expect.any(String)
        } satisfies ApiSubscription;
        expect(result.body).toEqual(expected);
        expect(mNotification).toHaveBeenCalledTimes(1);
        expect(mNotification.mock.calls[0][0]).toEqual({
            event: IoEvent.NEW_RECORD,
            message: {
                type: 'SUBSCRIPTION',
                record: {
                    ...expected,
                    updatedAt: expect.any(Date),
                    createdAt: expect.any(Date)
                } satisfies ApiSubscription
            },
            to: user.id
        });
    });

    it('returns the existing subscription', async () => {
        const user = await prisma.user.create({
            data: generateUser({ email: 'foo@bar.ch' })
        });
        const subscription = await prisma.subscription.create({
            data: generateSubscription({ userId: user.id })
        });

        const pre = await prisma.subscription.findMany();
        expect(pre.length).toEqual(1);

        const result = await request(app)
            .post(`${API_URL}/subscriptions`)
            .set('authorization', JSON.stringify({ email: user.email }));

        const all = await prisma.subscription.findMany();
        expect(all.length).toEqual(1);

        expect(result.statusCode).toEqual(200);

        const expected = {
            ...prepareSubscription({ ...subscription, departments: [], untisClasses: [], ignoredEvents: [] }),
            updatedAt: expect.any(String),
            createdAt: subscription.createdAt.toISOString()
        };
        expect(result.body).toEqual(expected);
        expect(mNotification).toHaveBeenCalledTimes(0);
    });
});
