import request from 'supertest';
import app, { API_URL } from '../../src/app';
import prisma from '../../src/prisma';
import { generateUser } from '../factories/user';
import { truncate } from './helpers/db';
import { UserEventGroup, Role } from '@prisma/client';
import _ from 'lodash';
import { notify } from '../../src/middlewares/notify.nop';
import { IoEvent } from '../../src/routes/socketEventTypes';
import { faker } from '@faker-js/faker';
import { generateUserEventGroup, userEventGroupSequence } from '../factories/userEventGroup';
import { eventSequence, eventSequenceUnchecked } from '../factories/event';
import { ApiEvent } from '../../src/models/event.helpers';

jest.mock('../../src/middlewares/notify.nop');
const mNotification = <jest.Mock<typeof notify>>notify;

const prepareRegistrationPeriod = (ueGroup: UserEventGroup) => {
    return {
        ...JSON.parse(JSON.stringify(ueGroup))
    }
}
afterEach(() => {
    return truncate();
});

describe(`GET ${API_URL}/user_event_group/all`, () => {
    it("is not for public users", async () => {
        const result = await request(app)
            .get(`${API_URL}/user_event_group/all`);
        expect(result.statusCode).toEqual(401);
    });
    it("returns all registration periods for users", async () => {
        const user = await prisma.user.create({data: generateUser({})});
        await prisma.userEventGroup.createMany({
            data: userEventGroupSequence(3, {userId: user!.id})
        });
        const ueGroups = await prisma.userEventGroup.findMany();
        expect(ueGroups).toHaveLength(3);

        const result = await request(app)
            .get(`${API_URL}/user_event_group/all`)
            .set('authorization', JSON.stringify({email: user.email}));
        expect(result.statusCode).toEqual(200);
        expect(result.body.length).toEqual(3);
        expect(result.body.map((d: UserEventGroup) => d.id).sort()).toEqual(ueGroups.map(d => d.id).sort());
        expect(mNotification).toHaveBeenCalledTimes(0);
    });
});

describe(`GET ${API_URL}/user_event_group/:id`, () => {
    it("prevents public user to get user event group", async () => {
        const user = await prisma.user.create({data: generateUser({})});
        const ueGroup = await prisma.userEventGroup.create({data: generateUserEventGroup({userId: user!.id})});
        const result = await request(app)
            .get(`${API_URL}/user_event_group/${ueGroup!.id}`);
        expect(result.statusCode).toEqual(401);
        expect(mNotification).toHaveBeenCalledTimes(0);
    });
    it("can get user event group by id", async () => {
        const user = await prisma.user.create({data: generateUser({})});
        const ueGroup = await prisma.userEventGroup.create({data: generateUserEventGroup({userId: user!.id})});
        const result = await request(app)
            .get(`${API_URL}/user_event_group/${ueGroup!.id}`)
            .set('authorization', JSON.stringify({email: user.email}));
        expect(result.statusCode).toEqual(200);
        expect(result.body).toEqual(prepareRegistrationPeriod(ueGroup!));
        expect(mNotification).toHaveBeenCalledTimes(0);
    });
    it("returns 404 when user event group was not found", async () => {
        const user = await prisma.user.create({data: generateUser({})});
        const result = await request(app)
            .get(`${API_URL}/user_event_group/${faker.string.uuid()}`)
            .set('authorization', JSON.stringify({email: user.email}));
        expect(result.statusCode).toEqual(404);
        expect(mNotification).toHaveBeenCalledTimes(0);
    });
    it("prevents user to fetch other users event group by id", async () => {
        const user = await prisma.user.create({data: generateUser({})});
        const mallory = await prisma.user.create({data: generateUser({})});
        const ueGroup = await prisma.userEventGroup.create({data: generateUserEventGroup({userId: user!.id})});
        const result = await request(app)
            .get(`${API_URL}/user_event_group/${ueGroup!.id}`)
            .set('authorization', JSON.stringify({email: mallory.email}));
        expect(result.statusCode).toEqual(403);
    });
});

describe(`PUT ${API_URL}/user_event_group/:id`, () => {
    it("lets users modify their own Registration Period", async () => {
        const user = await prisma.user.create({data: generateUser({})});
        const ueGroup = await prisma.userEventGroup.create({data: generateUserEventGroup({userId: user!.id})});

        const result = await request(app)
            .put(`${API_URL}/user_event_group/${ueGroup!.id}`)
            .set('authorization', JSON.stringify({email: user.email}))
            .send({data: {name: 'FOO'}});
        expect(result.statusCode).toEqual(200);
        expect(mNotification).toHaveBeenCalledTimes(1);
        expect(mNotification.mock.calls[0][0]).toEqual({
            event: IoEvent.CHANGED_RECORD,
            message: { record: 'USER_EVENT_GROUP', id: ueGroup!.id },
            to: user.id
        });
    });
    it("prevents users to modify others Registration Period", async () => {
        const user = await prisma.user.create({data: generateUser({})});
        const mallory = await prisma.user.create({data: generateUser({})});
        const ueGroup = await prisma.userEventGroup.create({data: generateUserEventGroup({userId: user!.id})});

        const result = await request(app)
            .put(`${API_URL}/user_event_group/${ueGroup!.id}`)
            .set('authorization', JSON.stringify({email: mallory.email}))
            .send({data: {name: 'FOO'}});
        expect(result.statusCode).toEqual(403);
        expect(mNotification).toHaveBeenCalledTimes(0);
    });
    it("prevents admins to modify others Registration Period", async () => {
        const user = await prisma.user.create({data: generateUser({})});
        const admin = await prisma.user.create({data: generateUser({role: Role.ADMIN})});
        const ueGroup = await prisma.userEventGroup.create({data: generateUserEventGroup({userId: user!.id})});
        const result = await request(app)
            .put(`${API_URL}/user_event_group/${ueGroup!.id}`)
            .set('authorization', JSON.stringify({email: admin.email}))
            .send({data: {name: 'FOO'}});
        expect(result.statusCode).toEqual(403);
        expect(mNotification).toHaveBeenCalledTimes(0);
    });
});

describe(`POST ${API_URL}/user_event_group`, () => {
    it("prevents public visitors to create a User Event Group", async () => {
        const result = await request(app)
            .post(`${API_URL}/user_event_group`)
            .send({name: 'FOO', description: 'BAR', event_ids: []});
        expect(result.statusCode).toEqual(401);
        expect(mNotification).toHaveBeenCalledTimes(0);
    });
    it("allows users to create a User Event Group", async () => {
        const user = await prisma.user.create({data: generateUser({})});
        const result = await request(app)
            .post(`${API_URL}/user_event_group`)
            .set('authorization', JSON.stringify({email: user.email}))
            .send({name: 'FOO', description: 'BAR', event_ids: []});
        expect(result.statusCode).toEqual(201);
        expect(result.body).toEqual({
            id: expect.any(String),
            userId: user.id,
            name: 'FOO',
            description: 'BAR',
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
        })
        expect(mNotification).toHaveBeenCalledTimes(1);
        expect(mNotification.mock.calls[0][0]).toEqual({
            event: IoEvent.NEW_RECORD,
            message: { record: 'USER_EVENT_GROUP', id: result.body.id },
            to: user.id
        });
    });
});

describe(`DELETE ${API_URL}/user_event_group/:id`, () => {
    it("delets a group but keeps the events", async () => {
        const user = await prisma.user.create({data: generateUser({})});
        await prisma.event.createMany({data: eventSequenceUnchecked(3, { authorId: user.id })});
        const events = await prisma.event.findMany();
        expect(events).toHaveLength(3);
        const ueGroup = await prisma.userEventGroup.create({
            data: generateUserEventGroup({userId: user!.id, events: { connect: events.map(e => ({id: e.id})) }}
        )});
        const result = await request(app)
            .delete(`${API_URL}/user_event_group/${ueGroup!.id}`)
            .set('authorization', JSON.stringify({email: user.email}));
        const postDeleteEvents = await prisma.event.findMany();
        expect(postDeleteEvents).toHaveLength(3);

        expect(result.statusCode).toEqual(204);
        expect(mNotification).toHaveBeenCalledTimes(1);
        expect(mNotification.mock.calls[0][0]).toEqual({
            event: IoEvent.DELETED_RECORD,
            message: { record: 'USER_EVENT_GROUP', id: ueGroup.id },
            to: user.id
        });
    });
});


describe(`GET ${API_URL}/user_event_group/:id/events`, () => {
    it("prevents public visitor to fetch group events", async () => {
        const user = await prisma.user.create({data: generateUser({})});
        await prisma.event.createMany({data: eventSequenceUnchecked(6, { authorId: user.id })});
        const events = await prisma.event.findMany();
        expect(events).toHaveLength(6);
        const ueGroup = await prisma.userEventGroup.create({
            data: generateUserEventGroup({userId: user!.id, events: { connect: events.slice(0, 3).map(e => ({id: e.id})) }}
        )});
        const result = await request(app)
            .get(`${API_URL}/user_event_group/${ueGroup!.id}/events`);

        expect(result.statusCode).toEqual(401);
    });
    it("returns all events of a group", async () => {
        const user = await prisma.user.create({data: generateUser({})});
        await prisma.event.createMany({data: eventSequenceUnchecked(6, { authorId: user.id })});
        const events = await prisma.event.findMany();
        expect(events).toHaveLength(6);
        const ueGroup = await prisma.userEventGroup.create({
            data: generateUserEventGroup({userId: user!.id, events: { connect: events.slice(0, 3).map(e => ({id: e.id})) }}
        )});
        const result = await request(app)
            .get(`${API_URL}/user_event_group/${ueGroup!.id}/events`)
            .set('authorization', JSON.stringify({email: user.email}));

        expect(result.statusCode).toEqual(200);
        expect(result.body).toHaveLength(3);
        expect(result.body.map((e: ApiEvent) => e.id).sort()).toEqual(events.slice(0, 3).map(e => e.id).sort());
        expect(mNotification).toHaveBeenCalledTimes(0);
    });
});

describe(`POST ${API_URL}/user_event_group/:id/clone`, () => {
    it("prevents public visitor to clone group", async () => {
        const user = await prisma.user.create({data: generateUser({})});
        const ueGroup = await prisma.userEventGroup.create({
            data: generateUserEventGroup({userId: user!.id })
        });
        const result = await request(app)
            .post(`${API_URL}/user_event_group/${ueGroup!.id}/clone`);

        expect(result.statusCode).toEqual(401);
    });
    it("returns 404 when user event group was not found", async () => {
        const user = await prisma.user.create({data: generateUser({})});
        const result = await request(app)
            .get(`${API_URL}/user_event_group/${faker.string.uuid()}/clone`)
            .set('authorization', JSON.stringify({email: user.email}));
        expect(result.statusCode).toEqual(404);
        expect(mNotification).toHaveBeenCalledTimes(0);
    });
    it("clones user groups including it's events", async () => {
        const user = await prisma.user.create({data: generateUser({})});
        await prisma.event.createMany({data: eventSequenceUnchecked(6, { authorId: user.id })});
        const events = await prisma.event.findMany();
        expect(events).toHaveLength(6);
        const ueGroup = await prisma.userEventGroup.create({
            data: generateUserEventGroup({userId: user!.id, events: { connect: events.slice(0, 3).map(e => ({id: e.id})) }}
        )});
        const result = await request(app)
            .post(`${API_URL}/user_event_group/${ueGroup!.id}/clone`)
            .set('authorization', JSON.stringify({email: user.email}));

        expect(result.statusCode).toEqual(201);
        expect(result.body).toEqual({
            ...ueGroup,
            id: expect.any(String),
            name: `📋 ${ueGroup.name}`,
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
        })
        expect(mNotification).toHaveBeenCalledTimes(1);
        expect(mNotification.mock.calls[0][0]).toEqual({
            event: IoEvent.NEW_RECORD,
            message: { record: 'USER_EVENT_GROUP', id: result.body.id },
            to: user.id
        });

        const postCloneEvents = await prisma.event.findMany();
        expect(postCloneEvents).toHaveLength(9);
        const cloned = postCloneEvents.filter(e => e.userGroupId === result.body.id);
        expect(cloned).toHaveLength(3);
        expect(cloned.map(e => {
            const cl = {...e};
            delete (cl as any).userGroupId;
            delete (cl as any).id;
        })).toEqual(events.slice(0, 3).map(e => {
            const cl = {...e};
            delete (cl as any).userGroupId;
            delete (cl as any).id;
        }));
    });
});