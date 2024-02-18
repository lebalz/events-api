import request from 'supertest';
import app, { API_URL } from '../../src/app';
import prisma from '../../src/prisma';
import { generateUser } from '../factories/user';
import { EventGroup, Role } from '@prisma/client';
import _ from 'lodash';
import { notify } from '../../src/middlewares/notify.nop';
import { IoEvent } from '../../src/routes/socketEventTypes';
import { faker } from '@faker-js/faker';
import { generateEventGroup } from '../factories/eventGroup';
import { eventSequenceUnchecked } from '../factories/event';
import { ApiEvent } from '../../src/models/event.helpers';

jest.mock('../../src/middlewares/notify.nop');
const mNotification = <jest.Mock<typeof notify>>notify;
const DEFAULT_INCLUDE_CONFIG = { events: { select: { id: true}}, users: { select: { id: true }} };

const prepareEventGroup = (eGroup: EventGroup) => {
    return {
        ...JSON.parse(JSON.stringify(eGroup))
    }
}

describe(`GET ${API_URL}/event_groups`, () => {
    it("is not for public users", async () => {
        const result = await request(app)
            .get(`${API_URL}/event_groups`);
        expect(result.statusCode).toEqual(401);
    });
    it("returns all registration periods for users", async () => {
        const user = await prisma.user.create({data: generateUser({})});
        for (var i = 0; i < 3; i++) {
            await prisma.eventGroup.create({data: generateEventGroup({userId: user!.id})});
        }
        const ueGroups = await prisma.eventGroup.findMany();
        expect(ueGroups).toHaveLength(3);

        const result = await request(app)
            .get(`${API_URL}/event_groups`)
            .set('authorization', JSON.stringify({email: user.email}));
        expect(result.statusCode).toEqual(200);
        expect(result.body.length).toEqual(3);
        expect(result.body.map((d: EventGroup) => d.id).sort()).toEqual(ueGroups.map(d => d.id).sort());
        expect(mNotification).toHaveBeenCalledTimes(0);
    });
});

describe(`GET ${API_URL}/event_groups/:id`, () => {
    it("prevents public user to get user event group", async () => {
        const user = await prisma.user.create({data: generateUser({})});
        const ueGroup = await prisma.eventGroup.create({data: generateEventGroup({userId: user!.id})});
        const result = await request(app)
            .get(`${API_URL}/event_groups/${ueGroup!.id}`);
        expect(result.statusCode).toEqual(401);
        expect(mNotification).toHaveBeenCalledTimes(0);
    });
    it("can get user event group by id", async () => {
        const user = await prisma.user.create({data: generateUser({})});
        const ueGroup = await prisma.eventGroup.create({
            data: generateEventGroup({userId: user!.id}),
            include: DEFAULT_INCLUDE_CONFIG
        });
        const result = await request(app)
            .get(`${API_URL}/event_groups/${ueGroup!.id}`)
            .set('authorization', JSON.stringify({email: user.email}));
        expect(result.statusCode).toEqual(200);
        expect(result.body).toEqual(prepareEventGroup(ueGroup!));
        expect(mNotification).toHaveBeenCalledTimes(0);
    });
    it("returns 404 when user event group was not found", async () => {
        const user = await prisma.user.create({data: generateUser({})});
        const result = await request(app)
            .get(`${API_URL}/event_groups/${faker.string.uuid()}`)
            .set('authorization', JSON.stringify({email: user.email}));
        expect(result.statusCode).toEqual(404);
        expect(mNotification).toHaveBeenCalledTimes(0);
    });
    it("prevents user to find other users event group by id", async () => {
        const user = await prisma.user.create({data: generateUser({})});
        const mallory = await prisma.user.create({data: generateUser({})});
        const ueGroup = await prisma.eventGroup.create({data: generateEventGroup({userId: user!.id})});
        const result = await request(app)
            .get(`${API_URL}/event_groups/${ueGroup!.id}`)
            .set('authorization', JSON.stringify({email: mallory.email}));
        expect(result.statusCode).toEqual(404);
    });
});

describe(`PUT ${API_URL}/event_groups/:id`, () => {
    it("lets users modify their own Registration Period", async () => {
        const user = await prisma.user.create({data: generateUser({})});
        const ueGroup = await prisma.eventGroup.create({data: generateEventGroup({userId: user!.id})});

        const result = await request(app)
            .put(`${API_URL}/event_groups/${ueGroup!.id}`)
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
        const ueGroup = await prisma.eventGroup.create({data: generateEventGroup({userId: user!.id})});

        const result = await request(app)
            .put(`${API_URL}/event_groups/${ueGroup!.id}`)
            .set('authorization', JSON.stringify({email: mallory.email}))
            .send({data: {name: 'FOO'}});
        expect(result.statusCode).toEqual(404);
        expect(mNotification).toHaveBeenCalledTimes(0);
    });
    it("prevents admins to modify others Registration Period", async () => {
        const user = await prisma.user.create({data: generateUser({})});
        const admin = await prisma.user.create({data: generateUser({role: Role.ADMIN})});
        const ueGroup = await prisma.eventGroup.create({data: generateEventGroup({userId: user!.id})});
        const result = await request(app)
            .put(`${API_URL}/event_groups/${ueGroup!.id}`)
            .set('authorization', JSON.stringify({email: admin.email}))
            .send({data: {name: 'FOO'}});
        expect(result.statusCode).toEqual(404);
        expect(mNotification).toHaveBeenCalledTimes(0);
    });
});

describe(`POST ${API_URL}/event_groups`, () => {
    it("prevents public visitors to create a User Event Group", async () => {
        const result = await request(app)
            .post(`${API_URL}/event_groups`)
            .send({name: 'FOO', description: 'BAR', event_ids: []});
        expect(result.statusCode).toEqual(401);
        expect(mNotification).toHaveBeenCalledTimes(0);
    });
    it("allows users to create a User Event Group", async () => {
        const user = await prisma.user.create({data: generateUser({})});
        const result = await request(app)
            .post(`${API_URL}/event_groups`)
            .set('authorization', JSON.stringify({email: user.email}))
            .send({name: 'FOO', description: 'BAR', event_ids: []});
        expect(result.statusCode).toEqual(201);
        expect(result.body).toEqual({
            id: expect.any(String),
            name: 'FOO',
            description: 'BAR',
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
            events: [],
            users: [{id: user.id}]
        })
        expect(mNotification).toHaveBeenCalledTimes(1);
        expect(mNotification.mock.calls[0][0]).toEqual({
            event: IoEvent.NEW_RECORD,
            message: { record: 'USER_EVENT_GROUP', id: result.body.id },
            to: user.id
        });
    });
});

describe(`DELETE ${API_URL}/event_groups/:id`, () => {
    it("delets a group but keeps the events", async () => {
        const user = await prisma.user.create({data: generateUser({})});
        await prisma.event.createMany({data: eventSequenceUnchecked(3, { authorId: user.id })});
        const events = await prisma.event.findMany();
        expect(events).toHaveLength(3);
        const ueGroup = await prisma.eventGroup.create({
            data: generateEventGroup({userId: user!.id, events: { connect: events.map(e => ({id: e.id})) }}
        )});
        const result = await request(app)
            .delete(`${API_URL}/event_groups/${ueGroup!.id}`)
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


describe(`GET ${API_URL}/event_groups/:id/events`, () => {
    it("prevents public visitor to fetch group events", async () => {
        const user = await prisma.user.create({data: generateUser({})});
        await prisma.event.createMany({data: eventSequenceUnchecked(6, { authorId: user.id })});
        const events = await prisma.event.findMany();
        expect(events).toHaveLength(6);
        const ueGroup = await prisma.eventGroup.create({
            data: generateEventGroup({userId: user!.id, events: { connect: events.slice(0, 3).map(e => ({id: e.id})) }}
        )});
        const result = await request(app)
            .get(`${API_URL}/event_groups/${ueGroup!.id}/events`);

        expect(result.statusCode).toEqual(401);
    });
    it("returns all events of a group", async () => {
        const user = await prisma.user.create({data: generateUser({})});
        await prisma.event.createMany({data: eventSequenceUnchecked(6, { authorId: user.id })});
        const events = await prisma.event.findMany();
        expect(events).toHaveLength(6);
        const ueGroup = await prisma.eventGroup.create({
            data: generateEventGroup({userId: user!.id, events: { connect: events.slice(0, 3).map(e => ({id: e.id})) }}
        )});
        const result = await request(app)
            .get(`${API_URL}/event_groups/${ueGroup!.id}/events`)
            .set('authorization', JSON.stringify({email: user.email}));

        expect(result.statusCode).toEqual(200);
        expect(result.body).toHaveLength(3);
        expect(result.body.map((e: ApiEvent) => e.id).sort()).toEqual(events.slice(0, 3).map(e => e.id).sort());
        expect(mNotification).toHaveBeenCalledTimes(0);
    });
});

describe(`POST ${API_URL}/event_groups/:id/clone`, () => {
    it("prevents public visitor to clone group", async () => {
        const user = await prisma.user.create({data: generateUser({})});
        const ueGroup = await prisma.eventGroup.create({
            data: generateEventGroup({userId: user!.id })
        });
        const result = await request(app)
            .post(`${API_URL}/event_groups/${ueGroup!.id}/clone`);

        expect(result.statusCode).toEqual(401);
    });
    it("returns 404 when user event group was not found", async () => {
        const user = await prisma.user.create({data: generateUser({})});
        const result = await request(app)
            .get(`${API_URL}/event_groups/${faker.string.uuid()}/clone`)
            .set('authorization', JSON.stringify({email: user.email}));
        expect(result.statusCode).toEqual(404);
        expect(mNotification).toHaveBeenCalledTimes(0);
    });
    it("clones user groups including it's events", async () => {
        const user = await prisma.user.create({data: generateUser({})});
        await prisma.event.createMany({data: eventSequenceUnchecked(6, { authorId: user.id })});
        const events = await prisma.event.findMany();
        expect(events).toHaveLength(6);
        const ueGroup = await prisma.eventGroup.create({
            data: generateEventGroup({userId: user!.id, events: { connect: events.slice(0, 3).map(e => ({id: e.id})) }}
        )});
        const result = await request(app)
            .post(`${API_URL}/event_groups/${ueGroup!.id}/clone`)
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

        const postCloneEvents = await prisma.event.findMany({
            include: {
                groups: {
                    select: {id: true}
                }
            }
        });
        expect(postCloneEvents).toHaveLength(9);
        const cloned = postCloneEvents.filter(e => e.groups.map(g => g.id).includes(result.body.id));
        expect(cloned).toHaveLength(3);
        expect(cloned.map(e => {
            const cl = {...e};
            delete (cl as any).id;
        })).toEqual(events.slice(0, 3).map(e => {
            const cl = {...e};
            delete (cl as any).id;
        }));
    });
});