import request from 'supertest';
import app, { API_URL } from '../../src/app';
import prisma from '../../src/prisma';
import { generateUser } from '../factories/user';
import {
    Department,
    Event,
    EventAudience,
    EventState,
    Job,
    JobState,
    RegistrationPeriod,
    Role,
    TeachingAffected,
    User
} from '@prisma/client';
import Jobs from '../../src/models/job';
import { eventSequence, generateEvent } from '../factories/event';
import { HttpStatusCode } from '../../src/utils/errors/BaseError';
import { generateSemester } from '../factories/semester';
import { faker } from '@faker-js/faker';
import { notify } from '../../src/middlewares/notify.nop';
import { IoEvent, RecordType } from '../../src/routes/socketEventTypes';
import { IoRoom } from '../../src/routes/socketEvents';
import _ from 'lodash';
import { generateDepartment } from '../factories/department';
import { ImportType } from '../../src/services/importEvents';
import { createDepartment } from '../unit/__tests__/departments.test';
import { createSemester } from '../unit/__tests__/semesters.test';
import { createRegistrationPeriod } from '../unit/__tests__/registrationPeriods.test';
import { generateUntisClass } from '../factories/untisClass';
import { createUser } from '../unit/__tests__/users.test';
import { Departments } from '../../src/services/helpers/departmentNames';
import * as eventModel from '../../src/models/event';
import { prepareEvent as originalPrepareEvent } from '../../src/models/event.helpers';
import { createEvent } from '../unit/__tests__/events.test';
import department from '../../src/models/department';
import { generateEventGroup } from '../factories/eventGroup';

jest.mock('../../src/middlewares/notify.nop');
const mNotification = <jest.Mock<typeof notify>>notify;

const prepareEvent = (event: Event): any => {
    const prepared = {
        departmentIds: [],
        publishedVersionIds: [],
        ...event,
        start: event.start.toISOString(),
        end: event.end.toISOString(),
        updatedAt: event.updatedAt.toISOString(),
        createdAt: event.createdAt.toISOString()
    };
    if (!event.meta) {
        delete (prepared as any).meta;
    }
    delete (prepared as any).departments;
    return prepared;
};

const prepareNotificationEvent = (
    event: Event & { departmentIds?: string[]; publishedVersionIds?: string[] }
): any => {
    const prepared = {
        departmentIds: [],
        publishedVersionIds: [],
        ...event,
        start: new Date(event.start),
        end: new Date(event.end),
        updatedAt: new Date(event.updatedAt),
        createdAt: new Date(event.createdAt)
    };
    if (!event.meta) {
        delete (prepared as any).meta;
    }
    delete (prepared as any).departments;
    return prepared;
};

const prepareNotificationJob = (job: Job): any => {
    const prepared = {
        ...job,
        updatedAt: new Date(job.updatedAt),
        createdAt: new Date(job.createdAt)
    };
    return prepared;
};

describe(`GET ${API_URL}/events`, () => {
    it('lets unauthorized user fetch all public events', async () => {
        const user = await prisma.user.create({
            data: generateUser({ email: 'foo@bar.ch' })
        });
        const between = { from: new Date(), to: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7 * 12) };
        const pubEvents = await Promise.all(
            eventSequence(user.id, 8, { state: EventState.PUBLISHED, between: between }).map((e) =>
                prisma.event.create({ data: e })
            )
        );
        const pubDeletedEvents = await Promise.all(
            eventSequence(user.id, 2, {
                state: EventState.PUBLISHED,
                deletedAt: new Date(),
                between: between
            }).map((e) => prisma.event.create({ data: e }))
        );
        const draftEvents = await Promise.all(
            eventSequence(user.id, 3, { state: EventState.DRAFT, between: between }).map((e) =>
                prisma.event.create({ data: e })
            )
        );
        const refusedEvents = await Promise.all(
            eventSequence(user.id, 2, { state: EventState.REFUSED, between: between }).map((e) =>
                prisma.event.create({ data: e })
            )
        );
        const reviewEvents = await Promise.all(
            eventSequence(user.id, 4, { state: EventState.REVIEW, between: between }).map((e) =>
                prisma.event.create({ data: e })
            )
        );
        const result = await request(app)
            .get(`${API_URL}/events`)
            .set('authorization', JSON.stringify({ noAuth: true }));
        expect(result.statusCode).toEqual(200);
        expect(result.body.length).toEqual(10);
        expect(result.body.map((e: any) => e.id).sort()).toEqual(
            [...pubEvents, ...pubDeletedEvents].map((e) => e.id).sort()
        );
        pubDeletedEvents.forEach((e) => {
            const dEvent = result.body.find((r: any) => r.id === e.id);
            expect(dEvent.deletedAt).not.toBeNull();
        });
        expect(mNotification).toHaveBeenCalledTimes(0);
    });
    it('lets caller specify ids to fetch', async () => {
        const user = await prisma.user.create({
            data: generateUser({ email: 'foo@bar.ch' })
        });
        const between = { from: new Date(), to: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7 * 12) };
        const pubEvents = await Promise.all(
            eventSequence(user.id, 8, { state: EventState.PUBLISHED, between: between }).map((e) =>
                prisma.event.create({ data: e })
            )
        );
        const pubDeletedEvents = await Promise.all(
            eventSequence(user.id, 2, {
                state: EventState.PUBLISHED,
                deletedAt: new Date(),
                between: between
            }).map((e) => prisma.event.create({ data: e }))
        );
        const draftEvents = await Promise.all(
            eventSequence(user.id, 3, { state: EventState.DRAFT, between: between }).map((e) =>
                prisma.event.create({ data: e })
            )
        );
        const refusedEvents = await Promise.all(
            eventSequence(user.id, 2, { state: EventState.REFUSED, between: between }).map((e) =>
                prisma.event.create({ data: e })
            )
        );
        const reviewEvents = await Promise.all(
            eventSequence(user.id, 4, { state: EventState.REVIEW, between: between }).map((e) =>
                prisma.event.create({ data: e })
            )
        );
        // public user will get only the public events
        const result = await request(app)
            .get(
                `${API_URL}/events?ids[]=${pubEvents[0].id}&ids[]=${pubEvents[1].id}&ids[]=${pubDeletedEvents[0].id}&ids[]=${draftEvents[0].id}`
            )
            .set('authorization', JSON.stringify({ noAuth: true }));
        expect(result.statusCode).toEqual(200);
        expect(result.body.length).toEqual(3);
        expect(result.body.map((e: any) => e.id).sort()).toEqual(
            [pubEvents[0], pubEvents[1], pubDeletedEvents[0]].map((e) => e.id).sort()
        );

        // authenticated user will get personal events too
        const authResult = await request(app)
            .get(
                `${API_URL}/events?ids[]=${pubEvents[0].id}&ids[]=${pubEvents[1].id}&ids[]=${pubDeletedEvents[0].id}&ids[]=${draftEvents[0].id}`
            )
            .set('authorization', JSON.stringify({ email: user.email }));
        expect(authResult.statusCode).toEqual(200);
        expect(authResult.body.length).toEqual(4);
        expect(authResult.body.map((e: any) => e.id).sort()).toEqual(
            [pubEvents[0], pubEvents[1], draftEvents[0], pubDeletedEvents[0]].map((e) => e.id).sort()
        );
    });
});

describe(`GET ${API_URL}/events/:id`, () => {
    it('unauthorized user can fetch public event', async () => {
        const user = await prisma.user.create({
            data: generateUser({ email: 'foo@bar.ch' })
        });
        const event = await prisma.event.create({
            data: generateEvent({ authorId: user.id, state: EventState.PUBLISHED })
        });
        const result = await request(app)
            .get(`${API_URL}/events/${event.id}`)
            .set('authorization', JSON.stringify({ noAuth: true }));
        expect(result.statusCode).toEqual(200);
        expect(result.body).toEqual(prepareEvent(event));
        expect(mNotification).toHaveBeenCalledTimes(0);
    });
    it('authorized user can fetch public event', async () => {
        const user = await prisma.user.create({
            data: generateUser({ email: 'foo@bar.ch' })
        });
        const other = await prisma.user.create({
            data: generateUser({ email: 'other@foo.ch' })
        });
        const event = await prisma.event.create({
            data: generateEvent({ authorId: other.id, state: EventState.PUBLISHED })
        });
        const result = await request(app)
            .get(`${API_URL}/events/${event.id}`)
            .set('authorization', JSON.stringify({ email: user.email }));
        expect(result.statusCode).toEqual(200);
        expect(result.body).toEqual(prepareEvent(event));
        expect(mNotification).toHaveBeenCalledTimes(0);
    });
});

describe(`PUT ${API_URL}/events/:id`, () => {
    it('Lets users update their own draft events', async () => {
        const user = await prisma.user.create({
            data: generateUser({ email: 'foo@bar.ch' })
        });
        const event = await prisma.event.create({
            data: generateEvent({ authorId: user.id, description: 'foo bar!' })
        });
        const result = await request(app)
            .put(`${API_URL}/events/${event.id}`)
            .set('authorization', JSON.stringify({ email: user.email }))
            .send({ data: { description: 'Hoo Ray!' } });
        expect(result.statusCode).toEqual(200);
        expect(result.body).toEqual({
            ...prepareEvent(event),
            description: 'Hoo Ray!',
            updatedAt: expect.any(String)
        });
        expect(mNotification).toHaveBeenCalledTimes(1);
        const updated = await prisma.event.findUniqueOrThrow({ where: { id: event.id } });
        expect(mNotification.mock.calls[0][0]).toEqual({
            event: IoEvent.CHANGED_RECORD,
            message: { type: RecordType.Event, record: prepareNotificationEvent(updated) },
            to: [user.id]
        });
    });

    /** TODO: check that only accepted attributes are updated */
});

describe(`PUT ${API_URL}/events`, () => {
    it('Lets users update multiple events', async () => {
        const user = await prisma.user.create({
            data: generateUser({ email: 'foo@bar.ch' })
        });
        const gymd = await createDepartment({ name: 'GYMD' });
        const event1 = await prisma.event.create({
            data: generateEvent({ authorId: user.id, description: 'foo bar!' })
        });
        const event2 = await createEvent({
            authorId: user.id,
            descriptionLong: 'foo bar!',
            departmentIds: [gymd.id]
        });
        const result = await request(app)
            .put(`${API_URL}/events`)
            .set('authorization', JSON.stringify({ email: user.email }))
            .send({
                data: [
                    {
                        id: event1.id,
                        description: 'Hoo Ray!'
                    },
                    {
                        id: event2.id,
                        descriptionLong: 'Japjapjap'
                    }
                ]
            });
        expect(result.statusCode).toEqual(200);
        expect(result.body.length).toEqual(2);
        expect(_.orderBy(result.body, 'id')).toEqual(
            _.orderBy(
                [
                    {
                        ...prepareEvent(event1),
                        description: 'Hoo Ray!',
                        updatedAt: expect.any(String)
                    },
                    {
                        ...prepareEvent(event2),
                        departmentIds: [gymd.id],
                        descriptionLong: 'Japjapjap',
                        updatedAt: expect.any(String)
                    }
                ],
                'id'
            )
        );
        expect(mNotification).toHaveBeenCalledTimes(2);
        const updated1 = await prisma.event.findUniqueOrThrow({ where: { id: event1.id } });
        const updated2 = await prisma.event.findUniqueOrThrow({ where: { id: event2.id } });
        expect(mNotification.mock.calls[0][0]).toEqual({
            event: IoEvent.CHANGED_RECORD,
            message: { type: RecordType.Event, record: prepareNotificationEvent(updated1) },
            to: user.id
        });
        expect(mNotification.mock.calls[1][0]).toEqual({
            event: IoEvent.CHANGED_RECORD,
            message: {
                type: RecordType.Event,
                record: prepareNotificationEvent({ ...updated2, departmentIds: [gymd.id] })
            },
            to: user.id
        });
    });

    /** TODO: check that only accepted attributes are updated */
});

describe(`PUT ${API_URL}/events/:id/meta`, () => {
    it('Lets users update the meta data of draft events', async () => {
        const user = await prisma.user.create({
            data: generateUser({ email: 'foo@bar.ch' })
        });
        const event = await prisma.event.create({
            data: generateEvent({
                authorId: user.id,
                description: 'foo bar!',
                meta: { warnings: ['hello'], warningsReviewed: false }
            })
        });
        expect(event.meta).toEqual({ warnings: ['hello'], warningsReviewed: false });
        const result = await request(app)
            .put(`${API_URL}/events/${event.id}/meta`)
            .set('authorization', JSON.stringify({ email: user.email }))
            .send({ data: { warningsReviewed: true } });
        expect(result.statusCode).toEqual(200);
        expect(result.body).toEqual({
            ...prepareEvent(event),
            updatedAt: expect.any(String),
            meta: { warnings: ['hello'], warningsReviewed: true }
        });
        expect(mNotification).toHaveBeenCalledTimes(1);
        const updated = await prisma.event.findUniqueOrThrow({ where: { id: event.id } });
        expect(mNotification.mock.calls[0][0]).toEqual({
            event: IoEvent.CHANGED_RECORD,
            message: { type: RecordType.Event, record: prepareNotificationEvent(updated) },
            to: user.id
        });
        const result2 = await request(app)
            .put(`${API_URL}/events/${event.id}/meta`)
            .set('authorization', JSON.stringify({ email: user.email }))
            .send({ data: null });
        const withoutMeta = { ...prepareEvent(event) };
        delete (withoutMeta as any).meta;
        expect(result2.body).toEqual({
            ...withoutMeta,
            updatedAt: expect.any(String)
        });
    });
    it('Lets users/admins update the meta data of review events', async () => {
        const user = await prisma.user.create({
            data: generateUser({ email: 'foo@bar.ch' })
        });
        const event = await prisma.event.create({
            data: generateEvent({
                authorId: user.id,
                state: EventState.REVIEW,
                description: 'foo bar!',
                meta: { warnings: ['hello'], warningsReviewed: false }
            })
        });
        expect(event.meta).toEqual({ warnings: ['hello'], warningsReviewed: false });
        const result = await request(app)
            .put(`${API_URL}/events/${event.id}/meta`)
            .set('authorization', JSON.stringify({ email: user.email }))
            .send({ data: { warningsReviewed: true } });
        expect(result.statusCode).toEqual(200);
        expect(result.body).toEqual({
            ...prepareEvent(event),
            updatedAt: expect.any(String),
            meta: { warnings: ['hello'], warningsReviewed: true }
        });
        expect(mNotification).toHaveBeenCalledTimes(1);
        const updated = await prisma.event.findUniqueOrThrow({ where: { id: event.id } });
        expect(mNotification.mock.calls[0][0]).toEqual({
            event: IoEvent.CHANGED_RECORD,
            message: { type: RecordType.Event, record: prepareNotificationEvent(updated) },
            to: user.id
        });
        const admin = await prisma.user.create({
            data: generateUser({ email: 'admin@bar.ch', role: Role.ADMIN })
        });
        const result2 = await request(app)
            .put(`${API_URL}/events/${event.id}/meta`)
            .set('authorization', JSON.stringify({ email: admin.email }))
            .send({ data: { warningsReviewed: false } });
        expect(result2.body).toEqual({
            ...prepareEvent(event),
            updatedAt: expect.any(String),
            meta: { warnings: ['hello'], warningsReviewed: false }
        });
    });
    [EventState.PUBLISHED, EventState.REFUSED].forEach((state) => {
        [Role.USER, Role.ADMIN].forEach((role) => {
            it(`Prevents ${role} to update the meta data of ${state} events`, async () => {
                const user = await prisma.user.create({
                    data: generateUser({ email: 'foo@bar.ch', role: role })
                });
                const event = await prisma.event.create({
                    data: generateEvent({
                        authorId: user.id,
                        state: state,
                        description: 'foo bar!',
                        meta: { warnings: ['hello'], warningsReviewed: false }
                    })
                });
                const result = await request(app)
                    .put(`${API_URL}/events/${event.id}/meta`)
                    .set('authorization', JSON.stringify({ email: user.email }))
                    .send({ data: { warningsReviewed: false } });
                expect(result.statusCode).toEqual(404);
            });
        });
    });
});

describe(`POST ${API_URL}/events`, () => {
    it('Lets users create a new draft', async () => {
        expect(mNotification).toHaveBeenCalledTimes(0);
        const user = await prisma.user.create({
            data: generateUser({ email: 'foo@bar.ch' })
        });
        const before = await prisma.event.findMany();
        expect(before.length).toEqual(0);

        const result = await request(app)
            .post(`${API_URL}/events`)
            .set('authorization', JSON.stringify({ email: user.email }))
            .send({ start: new Date('2023-09-20T08:25:00.000Z'), end: new Date('2023-09-20T09:10:00.000Z') });
        expect(result.statusCode).toEqual(201);
        expect(result.body.start).toEqual('2023-09-20T08:25:00.000Z');
        expect(result.body.end).toEqual('2023-09-20T09:10:00.000Z');
        expect(result.body.state).toEqual(EventState.DRAFT);

        expect(mNotification).toHaveBeenCalledTimes(1);
        const updated = await prisma.event.findFirstOrThrow({ where: { id: result.body.id } });
        expect(mNotification.mock.calls[0][0]).toEqual({
            event: IoEvent.NEW_RECORD,
            message: { type: RecordType.Event, record: prepareNotificationEvent(updated) },
            to: user.id
        });

        const after = await prisma.event.findMany();
        expect(after.length).toEqual(1);
    });

    [EventState.PUBLISHED, EventState.REVIEW, EventState.REFUSED].forEach((state) => {
        it(`creates a draft even when the state is set to ${state}`, async () => {
            expect(mNotification).toHaveBeenCalledTimes(0);
            const user = await prisma.user.create({
                data: generateUser({ email: 'foo@bar.ch' })
            });

            const result = await request(app)
                .post(`${API_URL}/events`)
                .set('authorization', JSON.stringify({ email: user.email }))
                .send({
                    start: new Date('2023-09-20T08:25:00.000Z'),
                    end: new Date('2023-09-20T09:10:00.000Z'),
                    state: state
                });
            expect(result.statusCode).toEqual(201);
            expect(result.body.state).toEqual(EventState.DRAFT);

            expect(mNotification).toHaveBeenCalledTimes(1);
            const updated = await prisma.event.findFirstOrThrow({ where: { id: result.body.id } });
            expect(mNotification.mock.calls[0][0]).toEqual({
                event: IoEvent.NEW_RECORD,
                message: { type: RecordType.Event, record: prepareNotificationEvent(updated) },
                to: user.id
            });
        });
    });
});
describe(`POST ${API_URL}/events/:id/normalize_audience`, () => {
    it('Lets users normalize the event audience', async () => {
        expect(mNotification).toHaveBeenCalledTimes(0);
        const user = await prisma.user.create({
            data: generateUser({ email: 'foo@bar.ch' })
        });
        const gymd = await createDepartment({
            name: 'GYMD',
            letter: 'G',
            classLetters: ['a', 'b', 'c'],
            schoolYears: 4
        });
        const wms = await createDepartment({
            name: 'WMS',
            letter: 'W',
            classLetters: ['d', 'e', 'f'],
            schoolYears: 4
        });
        const fms = await createDepartment({
            name: 'FMS',
            letter: 'F',
            classLetters: ['a', 'b', 'c'],
            schoolYears: 3
        });
        const event = await prisma.event.create({
            data: generateEvent({
                authorId: user.id,
                start: new Date('2025-04-08'),
                end: new Date('2025-04-08'),
                classes: ['28Ga', '28Gd', '29Ga', '28Fa', '27Fb', '26Fb', '28Wd', '26Wd', '25Wd'],
                classGroups: ['27F', '28W'],
                departmentIds: [wms.id]
            }),
            include: {
                departments: { select: { id: true } }
            }
        });

        const result = await request(app)
            .post(`${API_URL}/events/${event.id}/normalize_audience`)
            .set('authorization', JSON.stringify({ email: user.email }));
        expect(result.statusCode).toEqual(201);
        expect(result.body).toEqual({
            ...prepareEvent(event),
            updatedAt: expect.any(String),
            departmentIds: [wms.id],
            classes: ['28Ga', '26Fb'],
            classGroups: ['27F']
        });

        expect(mNotification).toHaveBeenCalledTimes(1);
        expect(mNotification.mock.calls[0][0]).toEqual({
            event: IoEvent.CHANGED_RECORD,
            message: { type: RecordType.Event, record: prepareNotificationEvent(result.body) },
            to: [user.id]
        });
    });
    it('can not normalize non-draft events', async () => {
        const user = await prisma.user.create({
            data: generateUser({ email: 'foo@bar.ch' })
        });
        const event = await prisma.event.create({
            data: generateEvent({
                authorId: user.id,
                state: EventState.PUBLISHED
            })
        });

        const result = await request(app)
            .post(`${API_URL}/events/${event.id}/normalize_audience`)
            .set('authorization', JSON.stringify({ email: user.email }));
        expect(result.statusCode).toEqual(400);
    });
});

describe(`DELETE ${API_URL}/events/:id`, () => {
    it('Lets users delete their own draft events', async () => {
        const user = await prisma.user.create({
            data: generateUser({ email: 'foo@bar.ch' })
        });
        const event = await prisma.event.create({ data: generateEvent({ authorId: user.id }) });
        const result = await request(app)
            .delete(`${API_URL}/events/${event.id}`)
            .set('authorization', JSON.stringify({ email: user.email }));
        expect(result.statusCode).toEqual(204);
        const all = await prisma.event.findMany();
        expect(all.length).toEqual(0);
        expect(mNotification).toHaveBeenCalledTimes(1);
        expect(mNotification.mock.calls[0][0]).toEqual({
            event: IoEvent.DELETED_RECORD,
            message: { type: RecordType.Event, id: event.id },
            to: user.id
        });
    });
    [EventState.PUBLISHED, EventState.REVIEW, EventState.REFUSED].forEach((state) => {
        it(`does a soft delete of an event with state ${state}`, async () => {
            const user = await prisma.user.create({
                data: generateUser({ email: 'foo@bar.ch' })
            });
            const event = await prisma.event.create({
                data: generateEvent({ authorId: user.id, state: state })
            });
            const result = await request(app)
                .delete(`${API_URL}/events/${event.id}`)
                .set('authorization', JSON.stringify({ email: user.email }));
            expect(result.statusCode).toEqual(204);
            const all = await prisma.event.findMany();
            expect(all.length).toEqual(1);

            const deleted = await prisma.event.findUniqueOrThrow({ where: { id: event.id } });
            expect(deleted?.deletedAt).not.toBeNull();
            expect(mNotification).toHaveBeenCalledTimes(1);
            expect(mNotification.mock.calls[0][0]).toEqual({
                event: IoEvent.CHANGED_RECORD,
                message: { type: RecordType.Event, record: prepareNotificationEvent(deleted) },
                to: IoRoom.ALL
            });
        });
    });
});

describe(`DELETE ${API_URL}/events?ids[]=`, () => {
    it('Lets users delete their own draft events', async () => {
        const user = await prisma.user.create({
            data: generateUser({ email: 'foo@bar.ch' })
        });
        const event1 = await prisma.event.create({ data: generateEvent({ authorId: user.id }) });
        const event2 = await prisma.event.create({ data: generateEvent({ authorId: user.id }) });
        const result = await request(app)
            .delete(`${API_URL}/events?ids[]=${event1.id}&ids[]=${event2.id}`)
            .set('authorization', JSON.stringify({ email: user.email }));
        expect(result.statusCode).toEqual(200);
        expect(result.body.sort()).toEqual([event1.id, event2.id].sort());
        const all = await prisma.event.findMany();
        expect(all.length).toEqual(0);
        expect(mNotification).toHaveBeenCalledTimes(2);
        expect(mNotification.mock.calls[0][0]).toEqual({
            event: IoEvent.DELETED_RECORD,
            message: { type: RecordType.Event, id: event1.id },
            to: user.id
        });
        expect(mNotification.mock.calls[1][0]).toEqual({
            event: IoEvent.DELETED_RECORD,
            message: { type: RecordType.Event, id: event2.id },
            to: user.id
        });
    });
    it('Lets users of group delete draft events', async () => {
        const user1 = await prisma.user.create({
            data: generateUser({ email: 'foo@bar.ch' })
        });
        const user2 = await prisma.user.create({
            data: generateUser({ email: 'foo2@bar.ch' })
        });
        const event1 = await prisma.event.create({ data: generateEvent({ authorId: user1.id }) });
        const event2 = await prisma.event.create({ data: generateEvent({ authorId: user1.id }) });

        const ueGroup = await prisma.eventGroup.create({
            data: generateEventGroup({ userIds: [user1.id, user2.id], eventIds: [event1.id, event2.id] })
        });
        const result = await request(app)
            .delete(`${API_URL}/events?ids[]=${event1.id}&ids[]=${event2.id}`)
            .set('authorization', JSON.stringify({ email: user2.email }));
        expect(result.statusCode).toEqual(200);
        expect(result.body.sort()).toEqual([event1.id, event2.id].sort());
        const all = await prisma.event.findMany();
        expect(all.length).toEqual(0);
        expect(mNotification).toHaveBeenCalledTimes(2);
        expect(mNotification.mock.calls[0][0]).toEqual({
            event: IoEvent.DELETED_RECORD,
            message: { type: RecordType.Event, id: event1.id },
            to: user1.id
        });
        expect(mNotification.mock.calls[1][0]).toEqual({
            event: IoEvent.DELETED_RECORD,
            message: { type: RecordType.Event, id: event2.id },
            to: user1.id
        });
    });
    [EventState.PUBLISHED, EventState.REVIEW, EventState.REFUSED].forEach((state) => {
        it(`does a soft delete of an event with state ${state}`, async () => {
            const user = await prisma.user.create({
                data: generateUser({ email: 'foo@bar.ch' })
            });
            const event = await prisma.event.create({
                data: generateEvent({ authorId: user.id, state: state })
            });
            const result = await request(app)
                .delete(`${API_URL}/events?ids[]=${event.id}`)
                .set('authorization', JSON.stringify({ email: user.email }));
            expect(result.statusCode).toEqual(200);
            const all = await prisma.event.findMany();
            expect(all.length).toEqual(1);

            const deleted = await prisma.event.findUniqueOrThrow({ where: { id: event.id } });
            expect(deleted?.deletedAt).not.toBeNull();
            expect(mNotification).toHaveBeenCalledTimes(1);
            expect(mNotification.mock.calls[0][0]).toEqual({
                event: IoEvent.CHANGED_RECORD,
                message: { type: RecordType.Event, record: prepareNotificationEvent(deleted) },
                to: IoRoom.ALL
            });
        });
    });
});

describe(`POST ${API_URL}/events/:id/clone`, () => {
    it('Lets users clone events', async () => {
        const user = await prisma.user.create({
            data: generateUser({ email: 'foo@bar.ch' })
        });
        const event = await prisma.event.create({
            data: generateEvent({ authorId: user.id, description: 'foo bar!' })
        });
        const result = await request(app)
            .post(`${API_URL}/events/${event.id}/clone`)
            .set('authorization', JSON.stringify({ email: user.email }));
        expect(result.statusCode).toEqual(201);
        const all = await prisma.event.findMany();
        expect(all.length).toEqual(2);
        expect(result.body).toEqual({
            ...prepareEvent(event),
            id: expect.any(String),
            cloned: true,
            parentId: null,
            clonedFromId: event.id,
            createdAt: expect.any(String),
            updatedAt: expect.any(String)
        });
        expect(result.body.description).toEqual('foo bar!');
        expect(mNotification).toHaveBeenCalledTimes(1);
        expect(mNotification.mock.calls[0][0]).toEqual({
            event: IoEvent.NEW_RECORD,
            message: { type: RecordType.Event, record: prepareNotificationEvent(result.body) },
            to: user.id
        });
    });

    it("Lets users clone other's published events", async () => {
        const other = await prisma.user.create({
            data: generateUser({ email: 'other@bar.ch' })
        });
        const user = await prisma.user.create({
            data: generateUser({ email: 'foo@bar.ch' })
        });
        const event = await prisma.event.create({
            data: generateEvent({ authorId: other.id, description: 'foo bar!', state: EventState.PUBLISHED })
        });
        const result = await request(app)
            .post(`${API_URL}/events/${event.id}/clone`)
            .set('authorization', JSON.stringify({ email: user.email }));
        expect(result.statusCode).toEqual(201);
        const all = await prisma.event.findMany();
        expect(all.length).toEqual(2);
        expect(result.body).toEqual({
            ...prepareEvent(event),
            id: expect.any(String),
            state: EventState.DRAFT,
            authorId: user.id,
            cloned: true,
            parentId: null,
            clonedFromId: event.id,
            createdAt: expect.any(String),
            updatedAt: expect.any(String)
        });
        expect(result.body.description).toEqual('foo bar!');
        expect(mNotification).toHaveBeenCalledTimes(1);
        expect(mNotification.mock.calls[0][0]).toEqual({
            event: IoEvent.NEW_RECORD,
            message: { type: RecordType.Event, record: prepareNotificationEvent(result.body) },
            to: user.id
        });
    });

    [EventState.DRAFT, EventState.REVIEW, EventState.REFUSED].forEach((state) => {
        it(`is forbidden for user to clone other's ${state} events`, async () => {
            const other = await prisma.user.create({
                data: generateUser({ email: 'other@bar.ch' })
            });
            const user = await prisma.user.create({
                data: generateUser({ email: 'foo@bar.ch' })
            });
            const event = await prisma.event.create({
                data: generateEvent({ authorId: other.id, description: 'foo bar!', state: state })
            });
            const result = await request(app)
                .post(`${API_URL}/events/${event.id}/clone`)
                .set('authorization', JSON.stringify({ email: user.email }));
            expect(result.statusCode).toEqual(403);
            const all = await prisma.event.findMany();
            expect(all.length).toEqual(1);
            expect(mNotification).toHaveBeenCalledTimes(0);
        });
    });
    it(`is not possible to clone non existant events`, async () => {
        const user = await prisma.user.create({
            data: generateUser({ email: 'foo@bar.ch' })
        });
        const result = await request(app)
            .post(`${API_URL}/events/${faker.string.uuid()}/clone`)
            .set('authorization', JSON.stringify({ email: user.email }));
        expect(result.statusCode).toEqual(404);
        expect(mNotification).toHaveBeenCalledTimes(0);
    });

    it('Lets users of group clone draft events', async () => {
        const user1 = await prisma.user.create({
            data: generateUser({ email: 'foo@bar.ch' })
        });
        const user2 = await prisma.user.create({
            data: generateUser({ email: 'foo2@bar.ch' })
        });
        const event = await prisma.event.create({
            data: generateEvent({ authorId: user1.id, description: 'shared event from user 1' })
        });

        const ueGroup = await prisma.eventGroup.create({
            data: generateEventGroup({ userIds: [user1.id, user2.id], eventIds: [event.id] })
        });

        const result = await request(app)
            .post(`${API_URL}/events/${event.id}/clone`)
            .set('authorization', JSON.stringify({ email: user2.email }));
        expect(result.statusCode).toEqual(201);
        const all = await prisma.event.findMany();
        expect(all.length).toEqual(2);
        expect(result.body).toEqual({
            ...prepareEvent(event),
            authorId: user2.id,
            id: expect.any(String),
            cloned: true,
            parentId: null,
            clonedFromId: event.id,
            createdAt: expect.any(String),
            updatedAt: expect.any(String)
        });
        expect(result.body.description).toEqual('shared event from user 1');
        expect(mNotification).toHaveBeenCalledTimes(1);
        expect(mNotification.mock.calls[0][0]).toEqual({
            event: IoEvent.NEW_RECORD,
            message: { type: RecordType.Event, record: prepareNotificationEvent(result.body) },
            to: user2.id
        });
    });
});

describe(`POST ${API_URL}/events/change_state`, () => {
    describe('allowed transitions', () => {
        const ALLOWED_TRANSITIONS = [
            {
                from: EventState.DRAFT,
                to: EventState.REVIEW,
                for: [Role.USER, Role.ADMIN],
                notify: ['user', IoRoom.ADMIN]
            },
            { from: EventState.REVIEW, to: EventState.PUBLISHED, for: [Role.ADMIN], notify: [IoRoom.ALL] },
            {
                from: EventState.REVIEW,
                to: EventState.REFUSED,
                for: [Role.ADMIN],
                notify: ['user', IoRoom.ADMIN]
            }
        ];
        ALLOWED_TRANSITIONS.forEach((transition) => {
            transition.for.forEach((role) => {
                it(`lets ${role} change state from ${transition.from} to ${transition.to}`, async () => {
                    const user = await prisma.user.create({
                        data: generateUser({ email: 'foo@bar.ch', role: role })
                    });
                    const gbsl = await createDepartment({ name: 'GYMD' });
                    const event = await prisma.event.create({
                        data: generateEvent({
                            authorId: user.id,
                            state: transition.from,
                            departmentIds: [gbsl.id]
                        })
                    });
                    const sem = await createSemester({
                        start: faker.date.recent({ refDate: event.start }),
                        end: faker.date.future({ refDate: event.end })
                    });
                    const regPeriod = await createRegistrationPeriod({
                        eventRangeStart: faker.date.recent({ refDate: event.start }),
                        departmentIds: [gbsl.id]
                    });

                    const result = await request(app)
                        .post(`${API_URL}/events/change_state`)
                        .set('authorization', JSON.stringify({ email: user.email }))
                        .send({ data: { ids: [event.id], state: transition.to } });
                    expect(result.statusCode).toEqual(201);
                    expect(result.body.length).toEqual(1);
                    expect(result.body[0].state).toEqual(transition.to);
                    expect(mNotification).toHaveBeenCalledTimes(transition.notify.length);
                    const updated = await prisma.event.findUniqueOrThrow({
                        where: { id: event.id },
                        include: { departments: true, children: true }
                    });
                    transition.notify.forEach((to, idx) => {
                        expect(mNotification.mock.calls[idx][0]).toEqual({
                            event: IoEvent.CHANGED_RECORD,
                            message: { type: RecordType.Event, record: originalPrepareEvent(updated) },
                            to: to === 'user' ? user.id : to,
                            toSelf: true
                        });
                    });
                });
            });
        });
    });

    describe('forbidden transitions', () => {
        const FORBIDDEN_TRANSITIONS = [
            { from: EventState.DRAFT, to: EventState.DRAFT, for: [Role.USER, Role.ADMIN] },
            { from: EventState.DRAFT, to: EventState.PUBLISHED, for: [Role.USER, Role.ADMIN] },
            { from: EventState.DRAFT, to: EventState.REFUSED, for: [Role.USER, Role.ADMIN] },
            { from: EventState.PUBLISHED, to: EventState.PUBLISHED, for: [Role.USER, Role.ADMIN] },
            { from: EventState.PUBLISHED, to: EventState.DRAFT, for: [Role.USER, Role.ADMIN] },
            { from: EventState.PUBLISHED, to: EventState.REFUSED, for: [Role.USER, Role.ADMIN] },
            { from: EventState.PUBLISHED, to: EventState.REVIEW, for: [Role.USER, Role.ADMIN] },
            { from: EventState.REVIEW, to: EventState.REVIEW, for: [Role.ADMIN] },
            {
                from: EventState.REVIEW,
                to: EventState.DRAFT,
                for: [Role.USER],
                errorCode: HttpStatusCode.FORBIDDEN
            },
            { from: EventState.REVIEW, to: EventState.DRAFT, for: [Role.ADMIN] },
            { from: EventState.REFUSED, to: EventState.REFUSED, for: [Role.USER, Role.ADMIN] },
            { from: EventState.REFUSED, to: EventState.DRAFT, for: [Role.USER, Role.ADMIN] },
            { from: EventState.REFUSED, to: EventState.PUBLISHED, for: [Role.USER, Role.ADMIN] },
            { from: EventState.REFUSED, to: EventState.REVIEW, for: [Role.USER, Role.ADMIN] }
        ];

        FORBIDDEN_TRANSITIONS.forEach((transition) => {
            transition.for.forEach((role) => {
                it(`forbids ${role} to change state from ${transition.from} to ${transition.to}`, async () => {
                    const user = await prisma.user.create({
                        data: generateUser({ email: 'foo@bar.ch', role: role })
                    });
                    const gbsl = await createDepartment({ name: 'GYMD' });
                    const event = await prisma.event.create({
                        data: generateEvent({
                            authorId: user.id,
                            state: transition.from,
                            departmentIds: [gbsl.id]
                        })
                    });
                    const sem = await createSemester({
                        start: faker.date.recent({ refDate: event.start }),
                        end: faker.date.future({ refDate: event.end })
                    });
                    const regPeriod = await createRegistrationPeriod({
                        eventRangeStart: faker.date.recent({ refDate: event.start }),
                        departmentIds: [gbsl.id]
                    });

                    const result = await request(app)
                        .post(`${API_URL}/events/change_state`)
                        .set('authorization', JSON.stringify({ email: user.email }))
                        .send({ data: { ids: [event.id], state: transition.to } });
                    expect(result.statusCode).toEqual(transition.errorCode || 400);
                    await expect(prisma.event.findUnique({ where: { id: event.id } })).resolves.toMatchObject(
                        { state: transition.from }
                    );
                    expect(mNotification).toHaveBeenCalledTimes(0);
                });
            });
        });
    });
    /** test versioned transitions */

    describe('versioned transitions', () => {
        it(`lets versioned DRAFTS become a REVIEW`, async () => {
            const user = await prisma.user.create({
                data: generateUser({ email: 'foo@bar.ch', role: Role.USER })
            });
            /**
             * event[:published]
             *   ^
             *   |                                              event[:published]
             * edit1[:draft]      ----> edit2[:review]            ^         ^
             *   ^                                                |         |
             *   |                                      edit1[:draft]    edit2[:review]
             * edit2[:draft]
             */
            const event = await prisma.event.create({
                data: generateEvent({ authorId: user.id, state: EventState.PUBLISHED })
            });
            const edit1 = await prisma.event.create({
                data: generateEvent({ authorId: user.id, parentId: event.id, state: EventState.DRAFT })
            });
            const edit2 = await prisma.event.create({
                data: generateEvent({ authorId: user.id, parentId: edit1.id, state: EventState.DRAFT })
            });
            const result = await request(app)
                .post(`${API_URL}/events/change_state`)
                .set('authorization', JSON.stringify({ email: user.email }))
                .send({ data: { ids: [edit2.id], state: EventState.REVIEW } });
            expect(result.statusCode).toEqual(201);
            expect(result.body.length).toEqual(1);
            expect(result.body[0].state).toEqual(EventState.REVIEW);
            expect(result.body[0].parentId).toEqual(event.id);
            expect(mNotification).toHaveBeenCalledTimes(2);
            const updated = await prisma.event.findUniqueOrThrow({ where: { id: edit2.id } });
            [user.id, IoRoom.ADMIN].forEach((to, idx) => {
                expect(mNotification.mock.calls[idx][0]).toEqual({
                    event: IoEvent.CHANGED_RECORD,
                    message: { type: RecordType.Event, record: prepareNotificationEvent(updated) },
                    to: to,
                    toSelf: true
                });
            });
        });

        it(`lets versioned REVIEWS become PUBLISHED`, async () => {
            const user = await prisma.user.create({
                data: generateUser({ email: 'foo@bar.ch', role: Role.ADMIN })
            });
            /**
             * event[:published/id:0]                                                       edit3[:published / id:0]  !! keeps published id !!
             *  ^                  ^                                                         ^                    ^
             *  |                   \                                                        |                     \
             * edit1[:review/id:1]  edit3[:review/id:3]    ----> !publish edit3!        event[:published/id:3]  edit1[:refused/id:1]
             *  ^                                                                                                     ^
             *  |                                                                                                     |
             * edit2[:draft/id:2]                                                                                    edit2[:draft/id:2]
             *
             */
            const start = faker.date.soon();
            const ende = new Date(start.getTime() + 365 * 24 * 60 * 60 * 1000); // + 1 year
            const semester = await prisma.semester.create({
                data: generateSemester({
                    start: start,
                    end: ende,
                    untisSyncDate: faker.date.between({ from: start, to: ende })
                })
            });
            const event = await prisma.event.create({
                data: generateEvent({
                    authorId: user.id,
                    state: EventState.PUBLISHED,
                    between: { from: start, to: ende }
                })
            });
            const edit1 = await prisma.event.create({
                data: generateEvent({
                    authorId: user.id,
                    parentId: event.id,
                    state: EventState.REVIEW,
                    clonedFromId: event.id,
                    between: { from: start, to: ende }
                })
            });
            const edit2 = await prisma.event.create({
                data: generateEvent({
                    authorId: user.id,
                    parentId: edit1.id,
                    state: EventState.DRAFT,
                    clonedFromId: edit1.id,
                    between: { from: start, to: ende }
                })
            });
            const edit3 = await prisma.event.create({
                data: generateEvent({
                    authorId: user.id,
                    parentId: event.id,
                    state: EventState.REVIEW,
                    clonedFromId: event.id,
                    between: { from: start, to: ende }
                })
            });
            const result = await request(app)
                .post(`${API_URL}/events/change_state`)
                .set('authorization', JSON.stringify({ email: user.email }))
                .send({ data: { ids: [edit3.id], state: EventState.PUBLISHED } });
            expect(result.statusCode).toEqual(201);
            expect(result.body.length).toEqual(1);
            expect(result.body[0].state).toEqual(EventState.PUBLISHED);

            expect(result.body[0].id).toEqual(event.id);

            const updatedEvent = await prisma.event.findUniqueOrThrow({ where: { id: event.id } });
            const updatedEdit1 = await prisma.event.findUniqueOrThrow({ where: { id: edit1.id } });
            const updatedEdit2 = await prisma.event.findUniqueOrThrow({ where: { id: edit2.id } });
            const updatedEdit3 = await prisma.event.findUniqueOrThrow({ where: { id: edit3.id } });

            /** swapped ids - updatedEvent is now the published "edit3" */
            expect(updatedEvent).toEqual({
                ...edit3,
                state: EventState.PUBLISHED,
                id: event.id,
                parentId: null,
                clonedFromId: edit3.id,
                updatedAt: expect.any(Date)
            });
            expect(updatedEvent?.updatedAt).not.toEqual(edit3.updatedAt);

            /** swapped ids - updatedEdit3 is now the "event" */
            expect(updatedEdit3).toEqual({
                ...event,
                state: EventState.PUBLISHED,
                id: edit3.id,
                clonedFromId: null,
                parentId: event.id,
                updatedAt: event.updatedAt
            });

            /** updatedEdit1 is now refused */
            expect(updatedEdit1).toEqual({
                ...edit1,
                state: EventState.REFUSED,
                updatedAt: expect.any(Date)
            });

            expect(updatedEdit2).toEqual(edit2);
            expect(mNotification).toHaveBeenCalledTimes(4);

            /* first the newly published event */
            expect(mNotification.mock.calls[0][0]).toEqual({
                event: IoEvent.CHANGED_RECORD,
                message: {
                    type: RecordType.Event,
                    record: prepareNotificationEvent({
                        ...updatedEvent,
                        publishedVersionIds: [edit3.id]
                    })
                },
                toSelf: true,
                to: IoRoom.ALL
            });
            /* then the previously published event -> edit3 */
            expect(mNotification.mock.calls[1][0]).toEqual({
                event: IoEvent.CHANGED_RECORD,
                message: { type: RecordType.Event, record: prepareNotificationEvent(updatedEdit3) },
                to: IoRoom.ALL,
                toSelf: true
            });
            /* then the refused's author -> edit1*/
            expect(mNotification.mock.calls[2][0]).toEqual({
                event: IoEvent.CHANGED_RECORD,
                message: { type: RecordType.Event, record: prepareNotificationEvent(updatedEdit1) },
                to: edit1.authorId,
                toSelf: true
            });
            /* finally admins */
            expect(mNotification.mock.calls[3][0]).toEqual({
                event: IoEvent.CHANGED_RECORD,
                message: { type: RecordType.Event, record: prepareNotificationEvent(updatedEdit1) },
                to: IoRoom.ADMIN,
                toSelf: true
            });
        });
    });

    it(`lets versioned REVIEWS become PUBLISHED: Scenario 2 (should never happen in real world...)`, async () => {
        const user = await prisma.user.create({
            data: generateUser({ email: 'foo@bar.ch', role: Role.ADMIN })
        });
        /**
         * event[:published/id:0]                                                       edit2[:published / id:0]  !! keeps published id !!
         *  ^                  ^                                                         ^                    ^
         *  |                   \                                                        |                     \
         * edit1[:review/id:1]  edit3[:review/id:3]    ----> !publish edit3!        event[:published/id:3]  edit1[:refused/id:1]
         *  ^                                                                                                     ^
         *  |                                                                                                     |
         * edit2[:review/id:2] (! should not happen )                                                           edit2[:refused/id:2]
         *
         */
        const event = await prisma.event.create({
            data: generateEvent({ authorId: user.id, state: EventState.PUBLISHED })
        });
        const edit1 = await prisma.event.create({
            data: generateEvent({ authorId: user.id, parentId: event.id, state: EventState.REVIEW })
        });
        const edit2 = await prisma.event.create({
            data: generateEvent({ authorId: user.id, parentId: edit1.id, state: EventState.REVIEW })
        });
        const edit3 = await prisma.event.create({
            data: generateEvent({ authorId: user.id, parentId: event.id, state: EventState.REVIEW })
        });
        const result = await request(app)
            .post(`${API_URL}/events/change_state`)
            .set('authorization', JSON.stringify({ email: user.email }))
            .send({ data: { ids: [edit3.id], state: EventState.PUBLISHED } });
        expect(result.statusCode).toEqual(201);
        expect(result.body.length).toEqual(1);
        expect(result.body[0].state).toEqual(EventState.PUBLISHED);

        expect(result.body[0].id).toEqual(event.id);

        const updatedEvent = await prisma.event.findUniqueOrThrow({ where: { id: event.id } });
        const updatedEdit1 = await prisma.event.findUniqueOrThrow({ where: { id: edit1.id } });
        const updatedEdit2 = await prisma.event.findUniqueOrThrow({ where: { id: edit2.id } });
        const updatedEdit3 = await prisma.event.findUniqueOrThrow({ where: { id: edit3.id } });

        /** swapped ids - updatedEvent is now the published "edit3" */
        expect(updatedEvent).toEqual({
            ...edit3,
            state: EventState.PUBLISHED,
            id: event.id,
            parentId: null,
            updatedAt: expect.any(Date)
        });
        expect(updatedEvent?.updatedAt).not.toEqual(edit3.updatedAt);

        /** swapped ids - updatedEdit3 is now the "event" */
        expect(updatedEdit3).toEqual({
            ...event,
            state: EventState.PUBLISHED,
            id: edit3.id,
            parentId: event.id,
            updatedAt: expect.any(Date)
        });
        expect(updatedEdit3?.updatedAt).toEqual(event.updatedAt);

        /** updatedEdit1 is now refused */
        expect(updatedEdit1).toEqual({
            ...edit1,
            state: EventState.REFUSED,
            updatedAt: expect.any(Date)
        });
        /** updatedEdit2 is now refused */
        expect(updatedEdit2).toEqual({
            ...edit2,
            state: EventState.REFUSED,
            updatedAt: expect.any(Date)
        });
        expect(mNotification).toHaveBeenCalledTimes(6);

        /* first the newly published version */
        // expect(mNotification.mock.calls[1][0]).toEqual({
        //     event: IoEvent.CHANGED_RECORD,
        //     message: { type: RecordType.Event, record: {...prepareEvent(event), id:  createdAt: expect.any(String), updatedAt: expect.any(String)} },
        //     to: IoRoom.ALL
        // });
        /**
         * 0: event -> all
         * 1: edit3 -> all
         * 2: edit1 -> author
         * 3: edit1 -> admin
         * 4: edit2 -> author
         * 5: edit2 -> admin
         */

        /* first the newly published version */
        expect(mNotification.mock.calls[0][0]).toEqual({
            event: IoEvent.CHANGED_RECORD,
            message: {
                type: RecordType.Event,
                record: prepareNotificationEvent({
                    ...updatedEvent,
                    publishedVersionIds: [edit3.id]
                })
            },
            to: IoRoom.ALL,
            toSelf: true
        });
        /* second the previous original event */
        expect(mNotification.mock.calls[1][0]).toEqual({
            event: IoEvent.CHANGED_RECORD,
            message: { type: RecordType.Event, record: prepareNotificationEvent(updatedEdit3) },
            to: IoRoom.ALL,
            toSelf: true
        });

        /* then the refused's authors and to the admins...*/
        const adminNotification = mNotification.mock.calls
            .map((c) => c[0])
            .filter((c) => c.to === IoRoom.ADMIN);
        expect(adminNotification.length).toEqual(2);
        const authorNotification = mNotification.mock.calls.map((c) => c[0]).filter((c) => c.to === user.id);
        expect(authorNotification.length).toEqual(2);

        // event1
        expect({
            event: IoEvent.CHANGED_RECORD,
            message: { type: RecordType.Event, record: prepareNotificationEvent(updatedEdit1) },
            to: edit1.authorId,
            toSelf: true
        }).toEqual(authorNotification.find((n) => n?.message?.record?.id === edit1.id));
        expect(adminNotification.find((n) => n?.message?.record?.id === edit1.id)).toEqual({
            event: IoEvent.CHANGED_RECORD,
            message: { type: RecordType.Event, record: prepareNotificationEvent(updatedEdit1) },
            to: IoRoom.ADMIN,
            toSelf: true
        });
        // event2
        expect(authorNotification.find((n) => n?.message?.record?.id === edit2.id)).toEqual({
            event: IoEvent.CHANGED_RECORD,
            message: { type: RecordType.Event, record: prepareNotificationEvent(updatedEdit2) },
            to: edit2.authorId,
            toSelf: true
        });
        expect(adminNotification.find((n) => n?.message?.record?.id === edit2.id)).toEqual({
            event: IoEvent.CHANGED_RECORD,
            message: { type: RecordType.Event, record: prepareNotificationEvent(updatedEdit2) },
            to: IoRoom.ADMIN,
            toSelf: true
        });
    });

    it(`lets versioned REVIEWS become PUBLISHED and keeps updated departments`, async () => {
        const user = await prisma.user.create({
            data: generateUser({ email: 'foo@bar.ch', role: Role.ADMIN })
        });
        /**
         * event[:published/id:0]
         *  ^
         *  |
         * edit1[:review/id:1]
         *
         */
        const department = await prisma.department.create({ data: generateDepartment({ name: 'GYMD' }) });
        const event = await prisma.event.create({
            data: generateEvent({
                authorId: user.id,
                state: EventState.PUBLISHED,
                departments: { connect: [{ id: department.id }] }
            })
        });
        const edit1 = await prisma.event.create({
            data: generateEvent({ authorId: user.id, parentId: event.id, state: EventState.REVIEW })
        });
        const result = await request(app)
            .post(`${API_URL}/events/change_state`)
            .set('authorization', JSON.stringify({ email: user.email }))
            .send({ data: { ids: [edit1.id], state: EventState.PUBLISHED } });
        expect(result.statusCode).toEqual(201);
        expect(result.body.length).toEqual(1);
        expect(result.body[0].state).toEqual(EventState.PUBLISHED);
        expect(result.body[0].id).toEqual(event.id);
        expect(result.body[0].description).toEqual(edit1.description);
        expect(result.body[0].departmentIds).toHaveLength(0);

        const updatedEvent = await prisma.event.findUnique({
            where: { id: edit1.id },
            include: { departments: true }
        });
        expect(updatedEvent?.departments).toHaveLength(1);
    });

    describe('transitions with registration periods', () => {
        describe('opened registration period', () => {
            let user: User;
            let admin: User;
            let regPeriod: RegistrationPeriod;
            let gymd: Department;
            let gymf: Department;
            let fms: Department;
            beforeEach(async () => {
                gymd = await createDepartment({ name: 'GYMD' });
                gymf = await createDepartment({ name: 'GYMF' });
                fms = await createDepartment({ name: 'FMS' });
                regPeriod = await createRegistrationPeriod({
                    start: new Date('2024-03-06T08:00:00.000Z'),
                    end: new Date('2024-03-10T12:00:00.000Z'),
                    eventRangeStart: new Date('2024-04-15T00:00:00.000Z'),
                    eventRangeEnd: new Date('2024-04-29T24:00:00.000Z'),
                    departmentIds: [gymd.id, fms.id]
                });
                user = await createUser({ role: Role.USER });
                admin = await createUser({ role: Role.ADMIN });
                /** transitions need a semester */
                await createSemester({
                    start: new Date('2024-02-06T08:00:00.000Z'),
                    end: new Date('2024-07-06T08:00:00.000Z')
                });
            });
            describe('allowed transitions during open registration period', () => {
                const ALLOWED_TRANSITIONS = [
                    {
                        descr: 'start and end in range',
                        from: EventState.DRAFT,
                        to: EventState.REVIEW,
                        for: [Role.USER, Role.ADMIN],
                        requestDate: new Date('2024-03-08T08:00:00.000Z'),
                        departments: [Departments.GYMD],
                        event: { start: '2024-04-15T00:00:00.000Z', end: '2024-04-30T12:00:00.000Z' }
                    },
                    {
                        descr: 'start in range, end outside range',
                        from: EventState.DRAFT,
                        to: EventState.REVIEW,
                        for: [Role.USER, Role.ADMIN],
                        requestDate: new Date('2024-03-08T08:00:00.000Z'),
                        departments: [Departments.FMS],
                        event: { start: '2024-04-15T00:00:00.000Z', end: '2024-04-30T12:00:00.000Z' }
                    },
                    {
                        descr: 'allows updates of published versions after reg period',
                        from: EventState.DRAFT,
                        to: EventState.REVIEW,
                        for: [Role.USER, Role.ADMIN],
                        requestDate: new Date('2024-04-08T08:00:00.000Z'),
                        hasParent: true,
                        departments: [Departments.GYMF],
                        event: { start: '2024-04-15T00:00:00.000Z', end: '2024-04-30T12:00:00.000Z' }
                    },
                    {
                        descr: 'Admin can transition drafts after period',
                        from: EventState.DRAFT,
                        to: EventState.REVIEW,
                        for: [Role.ADMIN],
                        requestDate: new Date('2024-03-15T08:00:00.000Z'),
                        departments: [Departments.FMS],
                        event: { start: '2024-04-15T00:00:00.000Z', end: '2024-04-30T12:00:00.000Z' }
                    },
                    {
                        descr: 'admin can refuse after period',
                        from: EventState.REVIEW,
                        to: EventState.REFUSED,
                        for: [Role.ADMIN],
                        author: Role.USER,
                        requestDate: new Date('2024-03-15T08:00:00.000Z'),
                        departments: [Departments.GYMD],
                        event: { start: '2024-04-15T00:00:00.000Z', end: '2024-04-30T12:00:00.000Z' }
                    },
                    {
                        descr: 'admin can publish after period',
                        from: EventState.REVIEW,
                        to: EventState.PUBLISHED,
                        for: [Role.ADMIN],
                        author: Role.USER,
                        requestDate: new Date('2024-03-15T08:00:00.000Z'),
                        departments: [Departments.FMS],
                        event: { start: '2024-04-15T00:00:00.000Z', end: '2024-04-30T12:00:00.000Z' }
                    }
                ];
                ALLOWED_TRANSITIONS.forEach((transition) => {
                    transition.for.forEach((role) => {
                        describe(transition.descr, () => {
                            beforeEach(() => {
                                jest.spyOn(eventModel, 'getCurrentDate').mockReturnValue(
                                    new Date(transition.requestDate)
                                );
                            });
                            it(`lets ${role} change state from ${transition.from} to ${transition.to} with ${transition.descr}`, async () => {
                                const reqUser = role === Role.USER ? user : admin;
                                const deps = [
                                    transition.departments.includes(Departments.FMS) && fms.id,
                                    transition.departments.includes(Departments.GYMD) && gymd.id,
                                    transition.departments.includes(Departments.GYMF) && gymf.id
                                ].filter((d) => !!d) as string[];
                                let parent: Event | undefined;
                                if (transition.hasParent) {
                                    parent = await prisma.event.create({
                                        data: generateEvent({
                                            authorId: reqUser.id,
                                            state: EventState.PUBLISHED
                                        })
                                    });
                                }
                                const event = await prisma.event.create({
                                    data: generateEvent({
                                        ...transition.event,
                                        state: transition.from,
                                        authorId: transition.author === Role.USER ? user.id : reqUser.id,
                                        parentId: (transition.hasParent && parent?.id) || undefined,
                                        departmentIds: deps
                                    })
                                });
                                const result = await request(app)
                                    .post(`${API_URL}/events/change_state`)
                                    .set('authorization', JSON.stringify({ email: reqUser.email }))
                                    .send({ data: { ids: [event.id], state: transition.to } });
                                expect(result.statusCode).toEqual(201);
                                expect(result.body.length).toEqual(1);
                                expect(result.body[0].state).toEqual(transition.to);
                            });
                        });
                    });
                });
            });
            describe('forbidden transitions during open registration period', () => {
                const FORBIDDEN_TRANSITIONS = [
                    {
                        descr: 'start outside range',
                        from: EventState.DRAFT,
                        to: EventState.REVIEW,
                        for: [Role.USER],
                        requestDate: new Date('2024-03-08T08:00:00.000Z'),
                        departments: [Departments.GYMD],
                        event: { start: '2024-04-14T23:59:00.000Z', end: '2024-04-27T12:00:00.000Z' }
                    },
                    {
                        descr: 'start and end outside range',
                        from: EventState.DRAFT,
                        to: EventState.REVIEW,
                        for: [Role.USER],
                        requestDate: new Date('2024-03-08T08:00:00.000Z'),
                        departments: [Departments.FMS],
                        event: { start: '2024-04-14T23:59:00.000Z', end: '2024-04-30T12:00:00.000Z' }
                    },
                    {
                        descr: 'request before reg period',
                        from: EventState.DRAFT,
                        to: EventState.REVIEW,
                        for: [Role.USER],
                        requestDate: new Date('2024-03-06T07:59:00.000Z'),
                        departments: [Departments.FMS],
                        event: { start: '2024-04-16T23:59:00.000Z', end: '2024-04-27T12:00:00.000Z' }
                    },
                    {
                        descr: 'request after reg period',
                        from: EventState.DRAFT,
                        to: EventState.REVIEW,
                        for: [Role.USER],
                        requestDate: new Date('2024-04-30T00:00:01.000Z'),
                        departments: [Departments.FMS],
                        event: { start: '2024-04-16T23:59:00.000Z', end: '2024-04-29T12:00:00.000Z' }
                    },
                    {
                        descr: 'department not in reg period',
                        from: EventState.DRAFT,
                        to: EventState.REVIEW,
                        for: [Role.USER],
                        requestDate: new Date('2024-03-08T08:00:00.000Z'),
                        departments: [Departments.GYMF],
                        event: { start: '2024-04-16T00:00:00.000Z', end: '2024-04-29T12:00:00.000Z' }
                    }
                ];
                FORBIDDEN_TRANSITIONS.forEach((transition) => {
                    transition.for.forEach((role) => {
                        describe(transition.descr, () => {
                            beforeEach(() => {
                                jest.spyOn(eventModel, 'getCurrentDate').mockReturnValue(
                                    new Date(transition.requestDate)
                                );
                            });
                            it(`lets ${role} change state from ${transition.from} to ${transition.to} with ${transition.descr}`, async () => {
                                const reqUser = role === Role.USER ? user : admin;
                                const deps = [
                                    transition.departments.includes(Departments.FMS) && fms.id,
                                    transition.departments.includes(Departments.GYMD) && gymd.id,
                                    transition.departments.includes(Departments.GYMF) && gymf.id
                                ].filter((d) => !!d) as string[];
                                const event = await prisma.event.create({
                                    data: generateEvent({
                                        ...transition.event,
                                        state: transition.from,
                                        authorId: reqUser.id,
                                        departmentIds: deps
                                    })
                                });
                                const result = await request(app)
                                    .post(`${API_URL}/events/change_state`)
                                    .set('authorization', JSON.stringify({ email: reqUser.email }))
                                    .send({ data: { ids: [event.id], state: transition.to } });
                                expect(result.statusCode).toEqual(400);
                                await expect(
                                    prisma.event.findUnique({ where: { id: event.id } })
                                ).resolves.toMatchObject({ state: transition.from });
                            });
                        });
                    });
                });
            });
        });
    });
});

describe(`POST ${API_URL}/events/import`, () => {
    beforeEach(async () => {
        await prisma.department.create({ data: generateDepartment({ name: 'GYMD' }) });
        await prisma.department.create({ data: generateDepartment({ name: 'GYMD/GYMF' }) });
        await prisma.department.create({ data: generateDepartment({ name: 'GYMF' }) });
        await prisma.department.create({ data: generateDepartment({ name: 'GYMF/GYMD' }) });
        await prisma.department.create({ data: generateDepartment({ name: 'FMS' }) });
        await prisma.department.create({ data: generateDepartment({ name: 'ECG' }) });
        await prisma.department.create({ data: generateDepartment({ name: 'ECG/FMS' }) });
        await prisma.department.create({ data: generateDepartment({ name: 'WMS' }) });
        await prisma.department.create({ data: generateDepartment({ name: 'ESC' }) });
        await prisma.department.create({ data: generateDepartment({ name: 'MSOP' }) });
        await prisma.department.create({ data: generateDepartment({ name: 'Passerelle' }) });
    });
    describe('GBSL Format: ?type=GBSL_XLSX', () => {
        it('lets admins import gbsl events: legacy format', async () => {
            const admin = await prisma.user.create({
                data: generateUser({ email: 'admin@bar.ch', role: Role.ADMIN })
            });

            const result = await request(app)
                .post(`${API_URL}/events/import?type=${ImportType.GBSL_XLSX}`)
                .set('authorization', JSON.stringify({ email: admin.email }))
                .attach('terminplan', `${__dirname}/stubs/terminplan-gbsl.xlsx`);
            expect(result.statusCode).toEqual(200);
            expect(result.body.state).toEqual(JobState.PENDING);
            expect(result.body.filename).toEqual('terminplan-gbsl.xlsx');
            /** wait for the import job to finish */
            let job = await Jobs.findModel(admin, result.body.id);
            while (job.state === JobState.PENDING) {
                await new Promise((resolve) => setTimeout(resolve, 50));
                job = await Jobs.findModel(admin, result.body.id);
            }
            expect(mNotification).toHaveBeenCalledTimes(1);
            expect(mNotification.mock.calls[0][0]).toEqual({
                event: IoEvent.NEW_RECORD,
                message: { type: RecordType.Job, record: prepareNotificationJob(result.body) },
                to: admin.id
            });

            expect(job.state).toEqual(JobState.DONE);
            expect(job.log.trim()).toEqual('# Success: 4/4 events imported');

            const events = await prisma.event.findMany({
                include: {
                    groups: {
                        select: { id: true }
                    },
                    departments: {
                        select: { id: true }
                    }
                }
            });
            expect(events.length).toEqual(4);
            events.forEach((e) => {
                expect(e.state).toEqual(EventState.DRAFT);
                expect(e.cloned).toBeFalsy();
                expect(e.jobId).toEqual(job.id);
                expect(e.parentId).toBeNull();
                expect(e.groups).toEqual([]);
                expect(e.deletedAt).toBeNull();
                expect(e.start.getTime()).toBeLessThanOrEqual(e.end.getTime());
                expect(e.classGroups).toEqual([]);
            });
            const departments = await prisma.department.findMany();
            const event1 = events.find((e) => e.description === '1. Schultag gemäss Programm');
            expect(event1?.descriptionLong).toEqual('');
            expect(event1?.location).toEqual('GBSL');
            expect(event1?.audience).toBe(EventAudience.STUDENTS);
            expect(event1?.teachingAffected).toEqual(TeachingAffected.PARTIAL);
            expect(event1?.start.toISOString()).toEqual('2023-08-21T00:00:00.000Z');
            expect(event1?.end.toISOString()).toEqual('2023-08-22T00:00:00.000Z');
            expect(event1?.classes).toEqual([]);
            expect(event1?.departments).toHaveLength(4);
            expect(event1?.departments.map((d) => d.id).sort()).toEqual(
                [
                    departments.find((d) => d.name === 'GYMD')?.id,
                    departments.find((d) => d.name === 'GYMD/GYMF')?.id,
                    departments.find((d) => d.name === 'FMS')?.id,
                    departments.find((d) => d.name === 'WMS')?.id
                ].sort()
            );

            const event2 = events.find((e) => e.description === '26Fa FMS1 Kurzklassenkonferenz');
            expect(event2?.descriptionLong).toEqual('');
            expect(event2?.location).toEqual('');
            expect(event2?.audience).toBe(EventAudience.LP);
            expect(event2?.teachingAffected).toEqual(TeachingAffected.NO);
            expect(event2?.start.toISOString()).toEqual('2023-08-24T12:15:00.000Z');
            expect(event2?.end.toISOString()).toEqual('2023-08-24T12:30:00.000Z');
            expect(event2?.classes).toEqual([]);
            expect(event2?.departments).toHaveLength(1);
            expect(event2?.departments.map((d) => d.id)).toEqual([
                departments.find((d) => d.name === 'FMS')?.id
            ]);

            const event3 = events.find(
                (e) =>
                    e.description ===
                    'Koordinationssitzung LK der neuen Bilingue-Klassen 27Gw, 27Gx, 27mT, 27mU'
            );
            expect(event3?.descriptionLong).toEqual('');
            expect(event3?.location).toEqual('M208');
            expect(event3?.audience).toBe(EventAudience.ALL);
            expect(event3?.teachingAffected).toEqual(TeachingAffected.YES);
            expect(event3?.start.toISOString()).toEqual('2023-08-24T12:15:00.000Z');
            expect(event3?.end.toISOString()).toEqual('2023-08-24T13:00:00.000Z');
            expect(event3?.classes).toEqual(['27Gw', '27Gx', '27mT', '27mU']);
            expect(event3?.departments).toHaveLength(0);

            const event4 = events.find(
                (e) => e.description === 'Information IDAF 1 Geschichte / Französisch'
            );
            expect(event4?.descriptionLong).toEqual(
                'Die Lehrpersonen informieren die Klasse in einer der Lektionen über den Zeitpunkt und Ablauf des IDAF-Moduls'
            );
            expect(event4?.location).toEqual('');
            expect(event4?.audience).toBe(EventAudience.KLP);
            expect(event4?.teachingAffected).toEqual(TeachingAffected.YES);
            expect(event4?.start.toISOString()).toEqual('2023-08-28T00:00:00.000Z');
            expect(event4?.end.toISOString()).toEqual('2023-09-02T00:00:00.000Z');
            expect(event4?.classes).toEqual(['26Wa']);
            expect(event4?.departments).toHaveLength(0);
        });

        it('prevents users from importing events', async () => {
            const user = await prisma.user.create({
                data: generateUser({ email: 'foo@bar.ch' })
            });

            const result = await request(app)
                .post(`${API_URL}/events/import?type=${ImportType.GBSL_XLSX}`)
                .set('authorization', JSON.stringify({ email: user.email }))
                .attach('terminplan', `${__dirname}/stubs/terminplan-gbsl.xlsx`);
            expect(result.statusCode).toEqual(403);

            expect(mNotification).toHaveBeenCalledTimes(0);
        });

        it('lets report the logs of failed imports', async () => {
            const admin = await prisma.user.create({
                data: generateUser({ email: 'admin@bar.ch', role: Role.ADMIN })
            });

            /** expect the logger to report an [error]: invalid signature: 0x73206f6e */
            const result = await request(app)
                .post(`${API_URL}/events/import?type=${ImportType.GBSL_XLSX}`)
                .set('authorization', JSON.stringify({ email: admin.email }))
                .attach('terminplan', `${__dirname}/stubs/terminplan-corrupted.xlsx`);
            expect(result.statusCode).toEqual(200);
            expect(result.body.state).toEqual(JobState.PENDING);
            expect(result.body.filename).toEqual('terminplan-corrupted.xlsx');

            expect(mNotification).toHaveBeenCalledTimes(1);
            expect(mNotification.mock.calls[0][0]).toEqual({
                event: IoEvent.NEW_RECORD,
                message: { type: RecordType.Job, record: prepareNotificationJob(result.body) },
                to: admin.id
            });

            /** wait for the import job to finish */
            let job = await Jobs.findModel(admin, result.body.id);
            while (job.state === JobState.PENDING) {
                await new Promise((resolve) => setTimeout(resolve, 50));
                job = await Jobs.findModel(admin, result.body.id);
            }
            expect(job.state).toEqual(JobState.ERROR);
            expect(job.log).toEqual(expect.any(String));
            expect(job.log.length).toBeGreaterThan(0);
            const events = await prisma.event.findMany();
            expect(events.length).toEqual(0);
            expect(mNotification).toHaveBeenCalledTimes(1);
        });
    });

    describe('GBJB Format: ?type=GBJB_CSV', () => {
        it('lets admins import gbjb events: legacy format', async () => {
            const admin = await prisma.user.create({
                data: generateUser({ email: 'admin@bar.ch', role: Role.ADMIN })
            });

            const result = await request(app)
                .post(`${API_URL}/events/import?type=${ImportType.GBJB_CSV}`)
                .set('authorization', JSON.stringify({ email: admin.email }))
                .attach('terminplan', `${__dirname}/stubs/terminplan-gbjb.csv`);
            expect(result.statusCode).toEqual(200);
            expect(result.body.state).toEqual(JobState.PENDING);
            expect(result.body.filename).toEqual('terminplan-gbjb.csv');
            /** wait for the import job to finish */
            let job = await Jobs.findModel(admin, result.body.id);
            while (job.state === JobState.PENDING) {
                await new Promise((resolve) => setTimeout(resolve, 50));
                job = await Jobs.findModel(admin, result.body.id);
            }
            expect(mNotification).toHaveBeenCalledTimes(1);
            expect(mNotification.mock.calls[0][0]).toEqual({
                event: IoEvent.NEW_RECORD,
                message: { type: RecordType.Job, record: prepareNotificationJob(result.body) },
                to: admin.id
            });

            expect(job.state).toEqual(JobState.DONE);
            expect(job.log.trim()).toEqual('# Success: 3/3 events imported');

            const events = await prisma.event.findMany({
                include: {
                    groups: {
                        select: { id: true }
                    },
                    departments: {
                        select: { id: true }
                    }
                }
            });
            expect(events.length).toEqual(3);
            events.forEach((e) => {
                expect(e.state).toEqual(EventState.DRAFT);
                expect(e.teachingAffected).toEqual(TeachingAffected.YES);
                expect(e.cloned).toBeFalsy();
                expect(e.jobId).toEqual(job.id);
                expect(e.parentId).toBeNull();
                expect(e.groups).toEqual([]);
                expect(e.departments).toEqual([]);
                expect(e.audience).toBe(EventAudience.STUDENTS);
                expect(e.deletedAt).toBeNull();
                expect(e.start.getTime()).toBeLessThanOrEqual(e.end.getTime());
                expect(e.classGroups).toEqual([]);
            });
            const event1 = events.find((e) => e.description === 'Dispense');
            expect(event1?.descriptionLong).toEqual(
                'Dispense de cours pour les élèves participant au concert de bienvenue'
            );
            expect(event1?.location).toEqual('');
            expect(event1?.start.toISOString()).toEqual('2023-08-22T00:00:00.000Z');
            expect(event1?.end.toISOString()).toEqual('2023-08-23T00:00:00.000Z');
            expect(event1?.classes).toEqual([]);

            const event2 = events.find((e) => e.description === 'début OC/EF');
            expect(event2?.descriptionLong).toEqual(
                `Classes GYM 3 et GYM4:\ndébut de l'enseignement des disciplines de l'OC, selon horaire`
            );
            expect(event2?.location).toEqual('');
            expect(event2?.start.toISOString()).toEqual('2023-08-25T14:55:00.000Z');
            expect(event2?.end.toISOString()).toEqual('2023-08-25T15:40:00.000Z');
            expect(event2?.classes).toEqual([]);

            const event3 = events.find((e) => e.description === 'Présentation OP');
            expect(event3?.descriptionLong).toEqual(
                `Présentation des offres du GBJB autour de l'orientation professionnelle, à l'aula:\nClasses de GYM4 (24A à 24H et 24KL): 8h25-9h10\nClasses de GYM3 (25A à 25M et 25KL): 9h20-10h05\nClasses de GYM2 (26A à 26I et 26KLP): 11h20-12h05`
            );
            expect(event3?.location).toEqual('');
            expect(event3?.start.toISOString()).toEqual('2023-08-29T08:25:00.000Z');
            expect(event3?.end.toISOString()).toEqual('2023-08-29T12:05:00.000Z');
            expect(event3?.classes?.sort()).toEqual(
                [
                    '24mA',
                    '24mH',
                    '24mT',
                    '24mU',
                    '25mA',
                    '25mM',
                    '25mT',
                    '25mU',
                    '26mA',
                    '26mI',
                    '26mT',
                    '26mU',
                    '26mV'
                ].sort()
            );
        });
    });

    describe('V1 Format: ?type=V1', () => {
        beforeEach(async () => {
            for (const kl of ['25Ga', '25Gb', '25Gc', '25Gd', '25Ge', '25Gf', '25Gg', '25Gh', '25Gi']) {
                await prisma.untisClass.create({
                    data: generateUntisClass({ name: kl })
                });
            }
        });
        it('lets users import V1 events', async () => {
            const user = await prisma.user.create({
                data: generateUser({ email: 'user@bar.ch', role: Role.USER })
            });

            const result = await request(app)
                .post(`${API_URL}/events/import?type=${ImportType.V1}`)
                .set('authorization', JSON.stringify({ email: user.email }))
                .attach('terminplan', `${__dirname}/stubs/terminplan-v1.xlsx`);
            expect(result.statusCode).toEqual(200);
            expect(result.body.state).toEqual(JobState.PENDING);
            expect(result.body.filename).toEqual('terminplan-v1.xlsx');
            /** wait for the import job to finish */
            let job = await Jobs.findModel(user, result.body.id);
            while (job.state === JobState.PENDING) {
                await new Promise((resolve) => setTimeout(resolve, 50));
                job = await Jobs.findModel(user, result.body.id);
            }
            expect(mNotification).toHaveBeenCalledTimes(1);
            expect(mNotification.mock.calls[0][0]).toEqual({
                event: IoEvent.NEW_RECORD,
                message: { type: RecordType.Job, record: prepareNotificationJob(result.body) },
                to: user.id
            });

            expect(job.state).toEqual(JobState.DONE);
            expect(job.log.trim()).toEqual(`# Success: 4/4 events imported`);

            const events = await prisma.event.findMany({
                include: {
                    groups: {
                        select: { id: true }
                    },
                    departments: {
                        select: { id: true, name: true }
                    }
                }
            });

            /**
             * There are 5 events in the excel, but one is deleted - this won't be imported again.
             */
            expect(events.length).toEqual(4);
            events.forEach((e) => {
                expect(e.state).toEqual(EventState.DRAFT);
                expect(e.cloned).toBeFalsy();
                expect(e.jobId).toEqual(job.id);
                expect(e.parentId).toBeNull();
                expect(e.groups).toEqual([]);
                expect(e.deletedAt).toBeNull();
                expect(e.start.getTime()).toBeLessThanOrEqual(e.end.getTime());
            });
            const event1 = events.find(
                (e) => e.description === 'Nachbefragung in Klassenstunde: GYM3 Klassen'
            )!;
            expect(event1.descriptionLong).toEqual(
                'QE führt die Klassenstunde mit den einsprachigen Klassen des JG. 25 durch'
            );
            expect(event1.location).toEqual('');
            expect(event1.start.toISOString()).toEqual('2024-02-26T00:00:00.000Z');
            expect(event1.end.toISOString()).toEqual('2024-03-02T00:00:00.000Z');
            expect(event1.classes.sort()).toEqual([
                '25Ga',
                '25Gb',
                '25Gc',
                '25Gd',
                '25Ge',
                '25Gf',
                '25Gg',
                '25Gh',
                '25Gi'
            ]);
            expect(event1.classGroups).toEqual([]);
            expect(event1.audience).toEqual(EventAudience.KLP);
            expect(event1.teachingAffected).toEqual(TeachingAffected.PARTIAL);
            expect(event1.affectsDepartment2).toBeFalsy();
            expect(event1.departments).toHaveLength(0);

            const event2 = events.find((e) => e.description === 'Information Maturaarbeit')!;
            expect(event2.descriptionLong).toEqual('Informationsveranstaltung Wegleitung');
            expect(event2.location).toEqual('M901');
            expect(event2.start.toISOString()).toEqual('2024-03-28T12:15:00.000Z');
            expect(event2.end.toISOString()).toEqual('2024-03-28T13:45:00.000Z');
            expect(event2.classes).toEqual([]);
            expect(event2.classGroups).toEqual(['25G']);
            expect(event2.audience).toEqual(EventAudience.STUDENTS);
            expect(event2.teachingAffected).toEqual(TeachingAffected.NO);
            expect(event2.affectsDepartment2).toBeTruthy();
            expect(event2.departments).toHaveLength(0);

            const event3 = events.find((e) => e.description === 'Pfingsten: Frei')!;
            expect(event3.descriptionLong).toEqual('Pfingstmontag: Frei');
            expect(event3.location).toEqual('');
            expect(event3.start.toISOString()).toEqual('2024-05-20T00:00:00.000Z');
            expect(event3.end.toISOString()).toEqual('2024-05-21T00:00:00.000Z');
            expect(event3.classes).toEqual([]);
            expect(event3.classGroups).toEqual([]);
            expect(event3.departments.map((d) => d.name).sort()).toEqual(['FMS', 'GYMD', 'GYMD/GYMF', 'WMS']);
            expect(event3.audience).toEqual(EventAudience.ALL);
            expect(event3.teachingAffected).toEqual(TeachingAffected.YES);
            expect(event3.affectsDepartment2).toBeFalsy();

            const event4 = events.find((e) => e.description === 'Singen')!;
            expect(event4.descriptionLong).toEqual('Gemeinsam singen');
            expect(event4.location).toEqual('');
            expect(event4.start.toISOString()).toEqual('2024-05-21T00:00:00.000Z');
            expect(event4.end.toISOString()).toEqual('2024-05-22T00:00:00.000Z');
            expect(event4.classes.sort()).toEqual(['25Gb', '25Gc', '25Gd', '25Ge', '25Gf', '25Gg', '25Gi']);
            expect(event4.classGroups).toEqual([]);
            expect(event4.departments.map((d) => d.name).sort()).toEqual([]);
            expect(event4.audience).toEqual(EventAudience.STUDENTS);
            expect(event4.teachingAffected).toEqual(TeachingAffected.YES);
            expect(event4.affectsDepartment2).toBeFalsy();
        });

        it('V1 import format handles column name mapping', async () => {
            const user = await prisma.user.create({
                data: generateUser({ email: 'user@bar.ch', role: Role.USER })
            });

            const result = await request(app)
                .post(`${API_URL}/events/import?type=${ImportType.V1}`)
                .set('authorization', JSON.stringify({ email: user.email }))
                .attach('terminplan', `${__dirname}/stubs/terminplan-v1-department-name-mapping.xlsx`);
            expect(result.statusCode).toEqual(200);
            /** wait for the import job to finish */
            let job = await Jobs.findModel(user, result.body.id);
            while (job.state === JobState.PENDING) {
                await new Promise((resolve) => setTimeout(resolve, 50));
                job = await Jobs.findModel(user, result.body.id);
            }

            const events = await prisma.event.findMany({
                include: {
                    groups: {
                        select: { id: true }
                    },
                    departments: {
                        select: { id: true, name: true }
                    }
                }
            });
            expect(events.length).toEqual(1);
            const event3 = events.find((e) => e.description === 'Pfingsten: Frei')!;
            expect(event3.descriptionLong).toEqual('Pfingstmontag: Frei');
            expect(event3.location).toEqual('');
            expect(event3.start.toISOString()).toEqual('2024-05-20T00:00:00.000Z');
            expect(event3.end.toISOString()).toEqual('2024-05-21T00:00:00.000Z');
            expect(event3.classes).toEqual([]);
            expect(event3.classGroups).toEqual([]);
            expect(event3.departments.map((d) => d.name).sort()).toEqual([
                'FMS',
                'GYMD',
                'GYMD/GYMF',
                'GYMF',
                'GYMF/GYMD',
                'WMS'
            ]);
            expect(event3.audience).toEqual(EventAudience.ALL);
            expect(event3.teachingAffected).toEqual(TeachingAffected.YES);
            expect(event3.affectsDepartment2).toBeTruthy();
        });

        it('V1 import format ignores missing columns', async () => {
            const user = await prisma.user.create({
                data: generateUser({ email: 'user@bar.ch', role: Role.USER })
            });

            const result = await request(app)
                .post(`${API_URL}/events/import?type=${ImportType.V1}`)
                .set('authorization', JSON.stringify({ email: user.email }))
                .attach('terminplan', `${__dirname}/stubs/terminplan-v1-missing-column.xlsx`);
            expect(result.statusCode).toEqual(200);
            /** wait for the import job to finish */
            let job = await Jobs.findModel(user, result.body.id);
            while (job.state === JobState.PENDING) {
                await new Promise((resolve) => setTimeout(resolve, 50));
                job = await Jobs.findModel(user, result.body.id);
            }

            const events = await prisma.event.findMany({
                include: {
                    groups: {
                        select: { id: true }
                    },
                    departments: {
                        select: { id: true, name: true }
                    }
                }
            });
            expect(events.length).toEqual(1);
            const event3 = events.find((e) => e.description === 'Pfingsten: Frei')!;
            expect(event3.descriptionLong).toEqual('Pfingstmontag: Frei');
            expect(event3.location).toEqual('');
            expect(event3.start.toISOString()).toEqual('2024-05-20T00:00:00.000Z');
            expect(event3.end.toISOString()).toEqual('2024-05-21T00:00:00.000Z');
            expect(event3.classes).toEqual([]);
            expect(event3.classGroups).toEqual([]);
            expect(event3.departments.map((d) => d.name).sort()).toEqual(['FMS', 'GYMD', 'WMS']);
            expect(event3.audience).toEqual(EventAudience.ALL);
            expect(event3.teachingAffected).toEqual(TeachingAffected.YES);
            expect(event3.affectsDepartment2).toBeFalsy();
        });

        it("V1 import format respects 'excdluded classes'", async () => {
            /** create some classes */
            for (const kl of ['23Fa', '24Fa', '24Fb', '24Ga', '24Gi', '24mA', '24mB', '24mT']) {
                await prisma.untisClass.create({
                    data: generateUntisClass({ name: kl })
                });
            }

            const user = await prisma.user.create({
                data: generateUser({ email: 'user@bar.ch', role: Role.USER })
            });

            const result = await request(app)
                .post(`${API_URL}/events/import?type=${ImportType.V1}`)
                .set('authorization', JSON.stringify({ email: user.email }))
                .attach('terminplan', `${__dirname}/stubs/terminplan-v1-excludes.xlsx`);
            expect(result.statusCode).toEqual(200);
            /** wait for the import job to finish */
            let job = await Jobs.findModel(user, result.body.id);
            while (job.state === JobState.PENDING) {
                await new Promise((resolve) => setTimeout(resolve, 50));
                job = await Jobs.findModel(user, result.body.id);
            }

            const events = await prisma.event.findMany({
                include: {
                    groups: {
                        select: { id: true }
                    },
                    departments: {
                        select: { id: true, name: true }
                    }
                }
            });
            expect(events.length).toEqual(1);

            const event4 = events.find((e) => e.description === 'Singen')!;
            expect(event4.descriptionLong).toEqual('Gemeinsam singen');
            expect(event4.location).toEqual('');
            expect(event4.start.toISOString()).toEqual('2024-05-21T00:00:00.000Z');
            expect(event4.end.toISOString()).toEqual('2024-05-22T00:00:00.000Z');
            expect(event4.classes.sort()).toEqual(
                [
                    '24Fb',
                    '24Ga',
                    '24mA',
                    '24mB',
                    '25Gb',
                    '25Gc',
                    '25Gd',
                    '25Ge',
                    '25Gf',
                    '25Gg',
                    '25Gi'
                ].sort()
            );
            expect(event4.classGroups).toEqual(['26m']);
            expect(event4.departments.map((d) => d.name).sort()).toEqual([]);
            expect(event4.audience).toEqual(EventAudience.STUDENTS);
            expect(event4.teachingAffected).toEqual(TeachingAffected.YES);
            expect(event4.affectsDepartment2).toBeFalsy();
        });
        it('V1 import format ignores failing rows', async () => {
            /** create some classes */
            const user = await prisma.user.create({
                data: generateUser({ email: 'user@bar.ch', role: Role.USER })
            });

            const result = await request(app)
                .post(`${API_URL}/events/import?type=${ImportType.V1}`)
                .set('authorization', JSON.stringify({ email: user.email }))
                .attach('terminplan', `${__dirname}/stubs/terminplan-v1-failed-row.xlsx`);
            expect(result.statusCode).toEqual(200);
            /** wait for the import job to finish */
            let job = await Jobs.findModel(user, result.body.id);
            while (job.state === JobState.PENDING) {
                await new Promise((resolve) => setTimeout(resolve, 50));
                job = await Jobs.findModel(user, result.body.id);
            }

            expect(job.log).toMatch(`# Success: 2/3 events imported
# Failed: 1
---------------------------------
FAILED:
  Error at row: 2`);
            const events = await prisma.event.findMany({
                include: {
                    groups: {
                        select: { id: true }
                    },
                    departments: {
                        select: { id: true, name: true }
                    }
                }
            });
            expect(events.length).toEqual(2);
            const event1 = events.find(
                (e) => e.description === 'Nachbefragung in Klassenstunde: GYM3 Klassen'
            )!;
            expect(event1.descriptionLong).toEqual(
                'QE führt die Klassenstunde mit den einsprachigen Klassen des JG. 25 durch'
            );
            expect(event1.location).toEqual('');
            expect(event1.start.toISOString()).toEqual('2024-02-26T00:00:00.000Z');
            expect(event1.end.toISOString()).toEqual('2024-03-02T00:00:00.000Z');
            expect(event1.classes.sort()).toEqual([
                '25Ga',
                '25Gb',
                '25Gc',
                '25Gd',
                '25Ge',
                '25Gf',
                '25Gg',
                '25Gh',
                '25Gi'
            ]);
            expect(event1.classGroups).toEqual([]);
            expect(event1.audience).toEqual(EventAudience.KLP);
            expect(event1.teachingAffected).toEqual(TeachingAffected.PARTIAL);
            expect(event1.affectsDepartment2).toBeFalsy();
            expect(event1.departments).toHaveLength(0);

            const event3 = events.find((e) => e.description === 'Pfingsten: Frei')!;
            expect(event3.descriptionLong).toEqual('Pfingstmontag: Frei');
            expect(event3.location).toEqual('');
            expect(event3.start.toISOString()).toEqual('2024-05-20T00:00:00.000Z');
            expect(event3.end.toISOString()).toEqual('2024-05-21T00:00:00.000Z');
            expect(event3.classes).toEqual([]);
            expect(event3.classGroups).toEqual([]);
            expect(event3.departments.map((d) => d.name).sort()).toEqual(['FMS', 'GYMD', 'GYMD/GYMF', 'WMS']);
            expect(event3.audience).toEqual(EventAudience.ALL);
            expect(event3.teachingAffected).toEqual(TeachingAffected.YES);
            expect(event3.affectsDepartment2).toBeFalsy();
        });

        it('prevents users from importing events', async () => {
            const user = await prisma.user.create({
                data: generateUser({ email: 'foo@bar.ch' })
            });

            const result = await request(app)
                .post(`${API_URL}/events/import?type=${ImportType.GBSL_XLSX}`)
                .set('authorization', JSON.stringify({ email: user.email }))
                .attach('terminplan', `${__dirname}/stubs/terminplan-gbsl.xlsx`);
            expect(result.statusCode).toEqual(403);

            expect(mNotification).toHaveBeenCalledTimes(0);
        });

        it('lets report the logs of failed imports', async () => {
            const admin = await prisma.user.create({
                data: generateUser({ email: 'admin@bar.ch', role: Role.ADMIN })
            });

            /** expect the logger to report an [error]: invalid signature: 0x73206f6e */
            const result = await request(app)
                .post(`${API_URL}/events/import?type=${ImportType.GBSL_XLSX}`)
                .set('authorization', JSON.stringify({ email: admin.email }))
                .attach('terminplan', `${__dirname}/stubs/terminplan-corrupted.xlsx`);
            expect(result.statusCode).toEqual(200);
            expect(result.body.state).toEqual(JobState.PENDING);
            expect(result.body.filename).toEqual('terminplan-corrupted.xlsx');

            expect(mNotification).toHaveBeenCalledTimes(1);
            expect(mNotification.mock.calls[0][0]).toEqual({
                event: IoEvent.NEW_RECORD,
                message: { type: RecordType.Job, record: prepareNotificationJob(result.body) },
                to: admin.id
            });

            /** wait for the import job to finish */
            let job = await Jobs.findModel(admin, result.body.id);
            while (job.state === JobState.PENDING) {
                await new Promise((resolve) => setTimeout(resolve, 50));
                job = await Jobs.findModel(admin, result.body.id);
            }
            expect(job.state).toEqual(JobState.ERROR);
            expect(job.log).toEqual(expect.any(String));
            expect(job.log.length).toBeGreaterThan(0);
            const events = await prisma.event.findMany();
            expect(events.length).toEqual(0);
            expect(mNotification).toHaveBeenCalledTimes(1);
        });
    });
});
