import request from 'supertest';
import app, { API_URL } from '../../src/app';
import prisma from '../../src/prisma';
import { generateUser } from '../factories/user';
import { Event, EventAudience, EventState, JobState, Role, TeachingAffected } from '@prisma/client';
import { truncate } from '../helpers/db';
import Jobs from '../../src/models/jobs';
import { eventSequence, generateEvent } from '../factories/event';
import { HttpStatusCode } from '../../src/utils/errors/BaseError';
import { generateSemester } from '../factories/semester';
import { faker } from '@faker-js/faker';
import { notify } from '../../src/middlewares/notify.nop';
import { IoEvent } from '../../src/routes/socketEventTypes';
import { IoRoom } from '../../src/routes/socketEvents';
import _ from 'lodash';
import { generateDepartment } from '../factories/department';
import { ImportType } from '../../src/services/importEvents';

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
    return prepared;
}

describe(`GET ${API_URL}/events`, () => {
    afterEach(() => {
        return truncate();
    });
    it("lets unauthorized user fetch all public events", async () => {
        const user = await prisma.user.create({
            data: generateUser({ email: 'foo@bar.ch' })
        });
        const pubEvents = await Promise.all(eventSequence(user.id, 8, { state: EventState.PUBLISHED }).map(e => prisma.event.create({ data: e })));
        const pubDeletedEvents = await Promise.all(eventSequence(user.id, 2, { state: EventState.PUBLISHED, deletedAt: new Date() }).map(e => prisma.event.create({ data: e })));
        const draftEvents = await Promise.all(eventSequence(user.id, 3, { state: EventState.DRAFT }).map(e => prisma.event.create({ data: e })));
        const refusedEvents = await Promise.all(eventSequence(user.id, 2, { state: EventState.REFUSED }).map(e => prisma.event.create({ data: e })));
        const reviewEvents = await Promise.all(eventSequence(user.id, 4, { state: EventState.REVIEW }).map(e => prisma.event.create({ data: e })));
        const result = await request(app)
            .get(`${API_URL}/events`)
            .set('authorization', JSON.stringify({ noAuth: true }));
        expect(result.statusCode).toEqual(200);
        expect(result.body.length).toEqual(10);
        expect(result.body.map((e: any) => e.id).sort()).toEqual([...pubEvents, ...pubDeletedEvents].map(e => e.id).sort());
        pubDeletedEvents.forEach((e) => {
            const dEvent = result.body.find((r: any) => r.id === e.id);
            expect(dEvent.deletedAt).not.toBeNull();
        });
        expect(mNotification).toHaveBeenCalledTimes(0);
    });
    it("lets authorized user fetch all public and it's own events", async () => {
        const user = await prisma.user.create({
            data: generateUser({ email: 'foo@bar.ch' })
        });
        const other = await prisma.user.create({
            data: generateUser({ email: 'other@foo.ch' })
        });
        const pubEvents = await Promise.all(eventSequence(user.id, 10, { state: EventState.PUBLISHED }).map(e => prisma.event.create({ data: e })));
        const draftEvents = await Promise.all(eventSequence(user.id, 3, { state: EventState.DRAFT }).map(e => prisma.event.create({ data: e })));
        const refusedEvents = await Promise.all(eventSequence(user.id, 2, { state: EventState.REFUSED }).map(e => prisma.event.create({ data: e })));
        const reviewEvents = await Promise.all(eventSequence(user.id, 4, { state: EventState.REVIEW }).map(e => prisma.event.create({ data: e })));
        const refusedOtherEvents = await Promise.all(eventSequence(other.id, 5, { state: EventState.REFUSED }).map(e => prisma.event.create({ data: e })));
        const reviewOtherEvents = await Promise.all(eventSequence(other.id, 5, { state: EventState.REVIEW }).map(e => prisma.event.create({ data: e })));
        const all = await prisma.event.findMany();
        expect(all.length).toEqual(29);

        const result = await request(app)
            .get(`${API_URL}/events`)
            .set('authorization', JSON.stringify({ email: user.email }));
        expect(result.statusCode).toEqual(200);
        expect(result.body.length).toEqual(19);
        expect(result.body.map((e: any) => e.id).sort()).toEqual([...pubEvents, ...draftEvents, ...refusedEvents, ...reviewEvents].map(e => e.id).sort());
        expect(mNotification).toHaveBeenCalledTimes(0);
    });

    it("lets admins fetch all events of state public, review and refused", async () => {
        const user = await prisma.user.create({
            data: generateUser({ email: 'foo@bar.ch' })
        });
        const admin = await prisma.user.create({
            data: generateUser({ email: 'admin@foo.ch', role: Role.ADMIN })
        });
        const pubEvents = await Promise.all(eventSequence(user.id, 10, { state: EventState.PUBLISHED }).map(e => prisma.event.create({ data: e })));
        const draftEvents = await Promise.all(eventSequence(user.id, 7, { state: EventState.DRAFT }).map(e => prisma.event.create({ data: e })));
        const refusedEvents = await Promise.all(eventSequence(user.id, 2, { state: EventState.REFUSED }).map(e => prisma.event.create({ data: e })));
        const reviewEvents = await Promise.all(eventSequence(user.id, 4, { state: EventState.REVIEW }).map(e => prisma.event.create({ data: e })));
        const draftAdminEvents = await Promise.all(eventSequence(admin.id, 5, { state: EventState.DRAFT }).map(e => prisma.event.create({ data: e })));
        const all = await prisma.event.findMany();
        expect(all.length).toEqual(28);

        const result = await request(app)
            .get(`${API_URL}/events`)
            .set('authorization', JSON.stringify({ email: admin.email }));
        expect(result.statusCode).toEqual(200);
        expect(result.body.length).toEqual(21);
        expect(result.body.map((e: any) => e.id).sort()).toEqual([...pubEvents, ...refusedEvents, ...reviewEvents, ...draftAdminEvents].map(e => e.id).sort());
        expect(mNotification).toHaveBeenCalledTimes(0);
    });
});


describe(`GET ${API_URL}/events/:id`, () => {
    afterEach(() => {
        return truncate();
    });
    it("unauthorized user can fetch public event", async () => {
        const user = await prisma.user.create({
            data: generateUser({ email: 'foo@bar.ch' })
        });
        const event = await prisma.event.create({ data: generateEvent({ authorId: user.id, state: EventState.PUBLISHED }) });
        const result = await request(app)
            .get(`${API_URL}/events/${event.id}`)
            .set('authorization', JSON.stringify({ noAuth: true }));
        expect(result.statusCode).toEqual(200);
        expect(result.body).toEqual(prepareEvent(event));
        expect(mNotification).toHaveBeenCalledTimes(0);
    });
    it("authorized user can fetch public event", async () => {
        const user = await prisma.user.create({
            data: generateUser({ email: 'foo@bar.ch' })
        });
        const other = await prisma.user.create({
            data: generateUser({ email: 'other@foo.ch' })
        });
        const event = await prisma.event.create({ data: generateEvent({ authorId: other.id, state: EventState.PUBLISHED }) });
        const result = await request(app)
            .get(`${API_URL}/events/${event.id}`)
            .set('authorization', JSON.stringify({ email: user.email }));
        expect(result.statusCode).toEqual(200);
        expect(result.body).toEqual(prepareEvent(event));
        expect(mNotification).toHaveBeenCalledTimes(0);
    });
});


describe(`PUT ${API_URL}/events/:id`, () => {
    afterEach(() => {
        return truncate();
    });
    it('Lets users update their own draft events', async () => {
        const user = await prisma.user.create({
            data: generateUser({ email: 'foo@bar.ch' })
        });
        const event = await prisma.event.create({ data: generateEvent({ authorId: user.id, description: 'foo bar!' }) });
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
        expect(mNotification.mock.calls[0][0]).toEqual({
            event: IoEvent.CHANGED_RECORD,
            message: { record: 'EVENT', id: result.body.id },
            to: user.id
        });
    });

    /** TODO: check that only accepted attributes are updated */
});


describe(`POST ${API_URL}/events`, () => {
    afterEach(() => {
        return truncate();
    });
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
        expect(mNotification.mock.calls[0][0]).toEqual({
            event: IoEvent.NEW_RECORD,
            message: { record: 'EVENT', id: result.body.id },
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
            expect(mNotification.mock.calls[0][0]).toEqual({
                event: IoEvent.NEW_RECORD,
                message: { record: 'EVENT', id: result.body.id },
                to: user.id
            });
        });
    });
});


describe(`DELETE ${API_URL}/events/:id`, () => {
    afterEach(() => {
        return truncate();
    });

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
            message: { record: 'EVENT', id: event.id },
            to: user.id
        });
    });
    [EventState.PUBLISHED, EventState.REVIEW, EventState.REFUSED].forEach((state) => {
        it(`does a soft delete of an event with state ${state}`, async () => {
            const user = await prisma.user.create({
                data: generateUser({ email: 'foo@bar.ch' })
            });
            const event = await prisma.event.create({ data: generateEvent({ authorId: user.id, state: state }) });
            const result = await request(app)
                .delete(`${API_URL}/events/${event.id}`)
                .set('authorization', JSON.stringify({ email: user.email }));
            expect(result.statusCode).toEqual(204);
            const all = await prisma.event.findMany();
            expect(all.length).toEqual(1);

            const deleted = await prisma.event.findUnique({ where: { id: event.id } });
            expect(deleted?.deletedAt).not.toBeNull();
            expect(mNotification).toHaveBeenCalledTimes(1);
            expect(mNotification.mock.calls[0][0]).toEqual({
                event: IoEvent.CHANGED_RECORD,
                message: { record: 'EVENT', id: event.id },
                to: IoRoom.ALL
            });
        });
    });
});


describe(`POST ${API_URL}/events/:id/clone`, () => {
    afterEach(() => {
        return truncate();
    });

    it('Lets users clone events', async () => {
        const user = await prisma.user.create({
            data: generateUser({ email: 'foo@bar.ch' })
        });
        const event = await prisma.event.create({ data: generateEvent({ authorId: user.id, description: 'foo bar!' }) });
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
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
        });
        expect(result.body.description).toEqual('foo bar!');
        expect(mNotification).toHaveBeenCalledTimes(1);
        expect(mNotification.mock.calls[0][0]).toEqual({
            event: IoEvent.NEW_RECORD,
            message: { record: 'EVENT', id: result.body.id },
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
        const event = await prisma.event.create({ data: generateEvent({ authorId: other.id, description: 'foo bar!', state: EventState.PUBLISHED }) });
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
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
        });
        expect(result.body.description).toEqual('foo bar!');
        expect(mNotification).toHaveBeenCalledTimes(1);
        expect(mNotification.mock.calls[0][0]).toEqual({
            event: IoEvent.NEW_RECORD,
            message: { record: 'EVENT', id: result.body.id },
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
            const event = await prisma.event.create({ data: generateEvent({ authorId: other.id, description: 'foo bar!', state: state }) });
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
});

describe(`POST ${API_URL}/events/change_state`, () => {
    afterEach(() => {
        return truncate();
    });
    describe('allowed transitions', () => {
        const ALLOWED_TRANSITIONS = [
            { from: EventState.DRAFT, to: EventState.REVIEW, for: [Role.USER, Role.ADMIN], notify: ['user', IoRoom.ADMIN] },
            { from: EventState.REVIEW, to: EventState.PUBLISHED, for: [Role.ADMIN], notify: [IoRoom.ALL] },
            { from: EventState.REVIEW, to: EventState.REFUSED, for: [Role.ADMIN], notify: ['user', IoRoom.ADMIN] },
        ]
        ALLOWED_TRANSITIONS.forEach((transition) => {
            transition.for.forEach((role) => {
                it(`lets ${role} change state from ${transition.from} to ${transition.to}`, async () => {
                    const user = await prisma.user.create({
                        data: generateUser({ email: 'foo@bar.ch', role: role })
                    });
                    const event = await prisma.event.create({ data: generateEvent({ authorId: user.id, state: transition.from }) });
                    const result = await request(app)
                        .post(`${API_URL}/events/change_state`)
                        .set('authorization', JSON.stringify({ email: user.email }))
                        .send({ data: { ids: [event.id], state: transition.to } });
                    expect(result.statusCode).toEqual(201);
                    expect(result.body.length).toEqual(1);
                    expect(result.body[0].state).toEqual(transition.to);
                    expect(mNotification).toHaveBeenCalledTimes(transition.notify.length);
                    transition.notify.forEach((to, idx) => {
                        expect(mNotification.mock.calls[idx][0]).toEqual({
                            event: IoEvent.CHANGED_STATE,
                            message: { state: transition.to, ids: [event.id] },
                            to: to === 'user' ? user.id : to
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
            { from: EventState.REVIEW, to: EventState.DRAFT, for: [Role.USER], errorCode: HttpStatusCode.FORBIDDEN },
            { from: EventState.REVIEW, to: EventState.DRAFT, for: [Role.ADMIN] },
            { from: EventState.REFUSED, to: EventState.REFUSED, for: [Role.USER, Role.ADMIN] },
            { from: EventState.REFUSED, to: EventState.DRAFT, for: [Role.USER, Role.ADMIN] },
            { from: EventState.REFUSED, to: EventState.PUBLISHED, for: [Role.USER, Role.ADMIN] },
            { from: EventState.REFUSED, to: EventState.REVIEW, for: [Role.USER, Role.ADMIN] },
        ]

        FORBIDDEN_TRANSITIONS.forEach((transition) => {
            transition.for.forEach((role) => {
                it(`forbids ${role} to change state from ${transition.from} to ${transition.to}`, async () => {
                    const user = await prisma.user.create({
                        data: generateUser({ email: 'foo@bar.ch', role: role })
                    });
                    const event = await prisma.event.create({ data: generateEvent({ authorId: user.id, state: transition.from }) });
                    const result = await request(app)
                        .post(`${API_URL}/events/change_state`)
                        .set('authorization', JSON.stringify({ email: user.email }))
                        .send({ data: { ids: [event.id], state: transition.to } });
                    expect(result.statusCode).toEqual(transition.errorCode || 400);
                    await expect(prisma.event.findUnique({ where: { id: event.id } }))
                        .resolves
                        .toMatchObject({ state: transition.from });
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
            const event = await prisma.event.create({ data: generateEvent({ authorId: user.id, state: EventState.PUBLISHED }) });
            const edit1 = await prisma.event.create({ data: generateEvent({ authorId: user.id, parentId: event.id, state: EventState.DRAFT }) });
            const edit2 = await prisma.event.create({ data: generateEvent({ authorId: user.id, parentId: edit1.id, state: EventState.DRAFT }) });
            const result = await request(app)
                .post(`${API_URL}/events/change_state`)
                .set('authorization', JSON.stringify({ email: user.email }))
                .send({ data: { ids: [edit2.id], state: EventState.REVIEW } });
            expect(result.statusCode).toEqual(201);
            expect(result.body.length).toEqual(1);
            expect(result.body[0].state).toEqual(EventState.REVIEW);
            expect(result.body[0].parentId).toEqual(event.id);
            expect(mNotification).toHaveBeenCalledTimes(2);
            [user.id, IoRoom.ADMIN].forEach((to, idx) => {
                expect(mNotification.mock.calls[idx][0]).toEqual({
                    event: IoEvent.CHANGED_STATE,
                    message: { state: EventState.REVIEW, ids: [edit2.id] },
                    to: to
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
                    untisSyncDate: faker.date.between({ from: start, to: ende }),
                })
            });
            const event = await prisma.event.create({ data: generateEvent({ authorId: user.id, state: EventState.PUBLISHED, between: {from: start, to: ende} }) });
            const edit1 = await prisma.event.create({ data: generateEvent({ authorId: user.id, parentId: event.id, state: EventState.REVIEW, between: {from: start, to: ende} }) });
            const edit2 = await prisma.event.create({ data: generateEvent({ authorId: user.id, parentId: edit1.id, state: EventState.DRAFT, between: {from: start, to: ende} }) });
            const edit3 = await prisma.event.create({ data: generateEvent({ authorId: user.id, parentId: event.id, state: EventState.REVIEW, between: {from: start, to: ende} }) });
            const result = await request(app)
                .post(`${API_URL}/events/change_state`)
                .set('authorization', JSON.stringify({ email: user.email }))
                .send({ data: { ids: [edit3.id], state: EventState.PUBLISHED } });
            expect(result.statusCode).toEqual(201);
            expect(result.body.length).toEqual(1);
            expect(result.body[0].state).toEqual(EventState.PUBLISHED);
            /** even if edi3 is now the versioned old published event, 
            it is reurned since it's state changed */
            expect(result.body[0].id).toEqual(edit3.id);

            const updatedEvent = await prisma.event.findUnique({ where: { id: event.id } });
            const updatedEdit1 = await prisma.event.findUnique({ where: { id: edit1.id } });
            const updatedEdit2 = await prisma.event.findUnique({ where: { id: edit2.id } });
            const updatedEdit3 = await prisma.event.findUnique({ where: { id: edit3.id } });

            /** swapped ids - updatedEvent is now the published "edit3" */
            expect(updatedEvent).toEqual({
                ...edit3,
                state: EventState.PUBLISHED,
                id: event.id,
                parentId: null,
                updatedAt: expect.any(Date),
            });
            expect(updatedEvent?.updatedAt).not.toEqual(edit3.updatedAt);

            /** swapped ids - updatedEdit3 is now the "event" */
            expect(updatedEdit3).toEqual({
                ...event,
                state: EventState.PUBLISHED,
                id: edit3.id,
                parentId: event.id,
                updatedAt: expect.any(Date),
            });
            expect(updatedEdit3?.updatedAt).not.toEqual(event.updatedAt);

            /** updatedEdit1 is now refused */
            expect(updatedEdit1).toEqual({
                ...edit1,
                state: EventState.REFUSED,
                updatedAt: expect.any(Date),
            });

            expect(updatedEdit2).toEqual(edit2);
            expect(mNotification).toHaveBeenCalledTimes(5);
            expect(mNotification.mock.calls[0][0]).toEqual({
                event: IoEvent.RELOAD_AFFECTING_EVENTS,
                message: { semesterIds: [semester.id] },
                to: IoRoom.ALL
            });
            expect(mNotification.mock.calls[1][0]).toEqual({
                event: IoEvent.CHANGED_STATE,
                message: { state: EventState.PUBLISHED, ids: [edit3.id] },
                to: IoRoom.ALL
            });
            /* first the original event */
            expect(mNotification.mock.calls[2][0]).toEqual({
                event: IoEvent.CHANGED_RECORD,
                message: { record: 'EVENT', id: event.id },
                to: IoRoom.ALL,
                toSelf: true
            });
            /* then the refused's author */
            expect(mNotification.mock.calls[3][0]).toEqual({
                event: IoEvent.CHANGED_RECORD,
                message: { record: 'EVENT', id: edit1.id },
                to: edit1.authorId,
                toSelf: true
            });
            /* finally admins */
            expect(mNotification.mock.calls[4][0]).toEqual({
                event: IoEvent.CHANGED_RECORD,
                message: { record: 'EVENT', id: edit1.id },
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
        const event = await prisma.event.create({ data: generateEvent({ authorId: user.id, state: EventState.PUBLISHED }) });
        const edit1 = await prisma.event.create({ data: generateEvent({ authorId: user.id, parentId: event.id, state: EventState.REVIEW }) });
        const edit2 = await prisma.event.create({ data: generateEvent({ authorId: user.id, parentId: edit1.id, state: EventState.REVIEW }) });
        const edit3 = await prisma.event.create({ data: generateEvent({ authorId: user.id, parentId: event.id, state: EventState.REVIEW }) });
        const result = await request(app)
            .post(`${API_URL}/events/change_state`)
            .set('authorization', JSON.stringify({ email: user.email }))
            .send({ data: { ids: [edit3.id], state: EventState.PUBLISHED } });
        expect(result.statusCode).toEqual(201);
        expect(result.body.length).toEqual(1);
        expect(result.body[0].state).toEqual(EventState.PUBLISHED);
        /** even if edi3 is now the versioned old published event, 
        it is reurned since it's state changed */
        expect(result.body[0].id).toEqual(edit3.id);

        const updatedEvent = await prisma.event.findUnique({ where: { id: event.id } });
        const updatedEdit1 = await prisma.event.findUnique({ where: { id: edit1.id } });
        const updatedEdit2 = await prisma.event.findUnique({ where: { id: edit2.id } });
        const updatedEdit3 = await prisma.event.findUnique({ where: { id: edit3.id } });

        /** swapped ids - updatedEvent is now the published "edit3" */
        expect(updatedEvent).toEqual({
            ...edit3,
            state: EventState.PUBLISHED,
            id: event.id,
            parentId: null,
            updatedAt: expect.any(Date),
        });
        expect(updatedEvent?.updatedAt).not.toEqual(edit3.updatedAt);

        /** swapped ids - updatedEdit3 is now the "event" */
        expect(updatedEdit3).toEqual({
            ...event,
            state: EventState.PUBLISHED,
            id: edit3.id,
            parentId: event.id,
            updatedAt: expect.any(Date),
        });
        expect(updatedEdit3?.updatedAt).not.toEqual(event.updatedAt);

        /** updatedEdit1 is now refused */
        expect(updatedEdit1).toEqual({
            ...edit1,
            state: EventState.REFUSED,
            updatedAt: expect.any(Date),
        });
        /** updatedEdit2 is now refused */
        expect(updatedEdit2).toEqual({
            ...edit2,
            state: EventState.REFUSED,
            updatedAt: expect.any(Date),
        });
        expect(mNotification).toHaveBeenCalledTimes(7);
        
        expect(mNotification.mock.calls[0][0]).toEqual({
            event: IoEvent.RELOAD_AFFECTING_EVENTS,
            message: { semesterIds: [] },
            to: IoRoom.ALL
        });

        /* first the newly published version */
        expect(mNotification.mock.calls[1][0]).toEqual({
            event: IoEvent.CHANGED_STATE,
            message: { state: EventState.PUBLISHED, ids: [edit3.id] },
            to: IoRoom.ALL
        });
        /* second the original event */
        expect(mNotification.mock.calls[2][0]).toEqual({
            event: IoEvent.CHANGED_RECORD,
            message: { record: 'EVENT', id: event.id },
            to: IoRoom.ALL,
            toSelf: true
        });
        /* then the refused's authors and to the admins...*/
        const adminNotification = mNotification.mock.calls.map(c => c[0]).filter(c => c.to === IoRoom.ADMIN);
        expect(adminNotification.length).toEqual(2);
        const authorNotification = mNotification.mock.calls.map(c => c[0]).filter(c => c.to === user.id);
        expect(authorNotification.length).toEqual(2);

        
        // event1
        expect(authorNotification.find(n => n?.message?.id === edit1.id)).toEqual({
            event: IoEvent.CHANGED_RECORD,
            message: { record: 'EVENT', id: edit1.id },
            to: edit1.authorId,
            toSelf: true
        });
        expect(adminNotification.find(n => n?.message?.id === edit1.id)).toEqual({
            event: IoEvent.CHANGED_RECORD,
            message: { record: 'EVENT', id: edit1.id },
            to: IoRoom.ADMIN,
            toSelf: true
        });
        // event2
        expect(authorNotification.find(n => n?.message?.id === edit2.id)).toEqual({
            event: IoEvent.CHANGED_RECORD,
            message: { record: 'EVENT', id: edit2.id },
            to: edit2.authorId,
            toSelf: true
        });
        expect(adminNotification.find(n => n?.message?.id === edit2.id)).toEqual({
            event: IoEvent.CHANGED_RECORD,
            message: { record: 'EVENT', id: edit2.id },
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
        const department = await prisma.department.create({data: generateDepartment({name: 'GBSL'})});
        const event = await prisma.event.create({ data: generateEvent({ authorId: user.id, state: EventState.PUBLISHED, departments: {connect: [{id: department.id}]} }) });
        const edit1 = await prisma.event.create({ data: generateEvent({ authorId: user.id, parentId: event.id, state: EventState.REVIEW }) });
        const result = await request(app)
            .post(`${API_URL}/events/change_state`)
            .set('authorization', JSON.stringify({ email: user.email }))
            .send({ data: { ids: [edit1.id], state: EventState.PUBLISHED } });
        expect(result.statusCode).toEqual(201);
        expect(result.body.length).toEqual(1);
        expect(result.body[0].state).toEqual(EventState.PUBLISHED);
        expect(result.body[0].id).toEqual(edit1.id);
        expect(result.body[0].description).toEqual(event.description);
        expect(result.body[0].departmentIds).toHaveLength(1);

        const updatedEvent = await prisma.event.findUnique({ where: { id: event.id }, include: {departments: true} });
        expect(updatedEvent?.departments).toHaveLength(0);

    });
});



describe(`POST ${API_URL}/events/import`, () => {
    describe('GBSL Format: ?type=GBSL_XLSX', () => {
        afterEach(() => {
            return truncate();
        });
        it("lets admins import gbsl events: legacy format", async () => {
            const admin = await prisma.user.create({
                data: generateUser({ email: 'admin@bar.ch', role: Role.ADMIN })
            });

            const result = await request(app)
                .post(`${API_URL}/events/import?type=${ImportType.GBSL_XLSX}`)
                .set('authorization', JSON.stringify({ email: admin.email }))
                .attach('terminplan', `${__dirname}/stubs/terminplan-import.xlsx`)
            expect(result.statusCode).toEqual(200);
            expect(result.body.state).toEqual(JobState.PENDING);
            expect(result.body.filename).toEqual('terminplan-import.xlsx');
            /** wait for the import job to finish */
            let job = await Jobs.findModel(admin, result.body.id);
            while (job.state === JobState.PENDING) {
                await new Promise((resolve) => setTimeout(resolve, 50));
                job = await Jobs.findModel(admin, result.body.id);
            }
            expect(mNotification).toHaveBeenCalledTimes(1);
            expect(mNotification.mock.calls[0][0]).toEqual({
                event: IoEvent.NEW_RECORD,
                message: { record: 'JOB', id: job.id },
                to: admin.id
            });

            expect(job.state).toEqual(JobState.DONE);
            expect(job.log).toEqual('');

            const events = await prisma.event.findMany();
            expect(events.length).toEqual(4);
            events.forEach((e) => {
                expect(e.state).toEqual(EventState.DRAFT);
                expect(e.teachingAffected).toEqual(TeachingAffected.YES);
                expect(e.cloned).toBeFalsy();
                expect(e.jobId).toEqual(job.id);
                expect(e.parentId).toBeNull();
                expect(e.userGroupId).toBeNull();
                expect(e.audience).toBe(EventAudience.STUDENTS);
                expect(e.deletedAt).toBeNull();
                expect(e.start.getTime()).toBeLessThanOrEqual(e.end.getTime());
                expect(e.classGroups).toEqual([]);
            });
            const event1 = events.find(e => e.description === '1. Schultag gemäss Programm');
            expect(event1?.descriptionLong).toEqual('');
            expect(event1?.location).toEqual('GBSL');
            expect(event1?.start.toISOString()).toEqual('2023-08-21T23:59:00.000Z');
            expect(event1?.end.toISOString()).toEqual('2023-08-21T23:59:00.000Z');
            expect(event1?.classes).toEqual([]);


            const event2 = events.find(e => e.description === '26Fa FMS1 Kurzklassenkonferenz');
            expect(event2?.descriptionLong).toEqual('');
            expect(event2?.location).toEqual('');
            expect(event2?.start.toISOString()).toEqual('2023-08-24T12:15:00.000Z');
            expect(event2?.end.toISOString()).toEqual('2023-08-24T12:30:00.000Z');
            expect(event2?.classes).toEqual([]);

            const event3 = events.find(e => e.description === 'Koordinationssitzung LK der neuen Bilingue-Klassen 27Gw, 27Gx, 27mT, 27mU');
            expect(event3?.descriptionLong).toEqual('');
            expect(event3?.location).toEqual('M208');
            expect(event3?.start.toISOString()).toEqual('2023-08-24T12:15:00.000Z');
            expect(event3?.end.toISOString()).toEqual('2023-08-24T13:00:00.000Z');
            expect(event3?.classes).toEqual(['27Gw', '27Gx', '27mT', '27mU']);

            const event4 = events.find(e => e.description === 'Information IDAF 1 Geschichte / Französisch');
            expect(event4?.descriptionLong).toEqual('Die Lehrpersonen informieren die Klasse in einer der Lektionen über den Zeitpunkt und Ablauf des IDAF-Moduls');
            expect(event4?.location).toEqual('');
            expect(event4?.start.toISOString()).toEqual('2023-08-28T00:00:00.000Z');
            expect(event4?.end.toISOString()).toEqual('2023-09-01T23:59:00.000Z');
            expect(event4?.classes).toEqual(['26Wa']);
        });

        it("prevents users from importing events", async () => {
            const user = await prisma.user.create({
                data: generateUser({ email: 'foo@bar.ch' })
            });

            const result = await request(app)
                .post(`${API_URL}/events/import?type=${ImportType.GBSL_XLSX}`)
                .set('authorization', JSON.stringify({ email: user.email }))
                .attach('terminplan', `${__dirname}/stubs/terminplan-import.xlsx`);
            expect(result.statusCode).toEqual(403);

            expect(mNotification).toHaveBeenCalledTimes(0);
        });

        it("lets report the logs of failed imports", async () => {
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
                message: { record: 'JOB', id: result.body.id },
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
        
        afterEach(() => {
            return truncate();
        });
        it("lets admins import gbjb events: legacy format", async () => {
            const admin = await prisma.user.create({
                data: generateUser({ email: 'admin@bar.ch', role: Role.ADMIN })
            });

            const result = await request(app)
                .post(`${API_URL}/events/import?type=${ImportType.GBJB_CSV}`)
                .set('authorization', JSON.stringify({ email: admin.email }))
                .attach('terminplan', `${__dirname}/stubs/terminplan-gbjb.csv`)
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
                message: { record: 'JOB', id: job.id },
                to: admin.id
            });

            expect(job.state).toEqual(JobState.DONE);
            expect(job.log).toEqual('');

            const events = await prisma.event.findMany();
            expect(events.length).toEqual(3);
            events.forEach((e) => {
                expect(e.state).toEqual(EventState.DRAFT);
                expect(e.teachingAffected).toEqual(TeachingAffected.YES);
                expect(e.cloned).toBeFalsy();
                expect(e.jobId).toEqual(job.id);
                expect(e.parentId).toBeNull();
                expect(e.userGroupId).toBeNull();
                expect(e.audience).toBe(EventAudience.STUDENTS);
                expect(e.deletedAt).toBeNull();
                expect(e.start.getTime()).toBeLessThanOrEqual(e.end.getTime());
                expect(e.classGroups).toEqual([]);
            });
            const event1 = events.find(e => e.description === 'Dispense');
            expect(event1?.descriptionLong).toEqual('Dispense de cours pour les élèves participant au concert de bienvenue');
            expect(event1?.location).toEqual('');
            expect(event1?.start.toISOString()).toEqual('2023-08-22T10:25:00.000Z');
            expect(event1?.end.toISOString()).toEqual('2023-08-22T12:05:00.000Z');
            expect(event1?.classes).toEqual([]);


            const event2 = events.find(e => e.description === 'début OC/EF');
            expect(event2?.descriptionLong).toEqual(`Classes GYM 3 et GYM4:\ndébut de l\\'enseignement des disciplines de l\\'OC, selon horaire`);
            expect(event2?.location).toEqual('');
            expect(event2?.start.toISOString()).toEqual('2023-08-25T14:55:00.000Z');
            expect(event2?.end.toISOString()).toEqual('2023-08-25T15:40:00.000Z');
            expect(event2?.classes).toEqual([]);

            const event3 = events.find(e => e.description === 'Présentation OP');
            expect(event3?.descriptionLong).toEqual(`Présentation des offres du GBJB autour de l\\'orientation professionnelle, à l\\'aula:\nClasses de GYM4 (24A à 24H et 24KL): 8h25-9h10\\r\\nClasses de GYM3 (25A à 25M et 25KL): 9h20-10h05\\r\\nClasses de GYM2 (26A à 26I et 26KLP): 11h20-12h05`);
            expect(event3?.location).toEqual('');
            expect(event3?.start.toISOString()).toEqual('2023-08-29T08:25:00.000Z');
            expect(event3?.end.toISOString()).toEqual('2023-08-29T12:05:00.000Z');
            expect(event3?.classes?.sort()).toEqual(['24mA', '24mH', '24mT', '24mU', '25mA', '25mM', '25mT', '25mU', '26mA', '26mI', '26mT', '26mU', '26mV'].sort());
        });

    });
});


describe(`POST ${API_URL}/events/export`, () => {
    afterEach(() => {
        return truncate();
    });

    it('Throws an error if no semester is found', async () => {
        const result = await request(app)
            .post(`${API_URL}/events/excel`);
        expect(result.statusCode).toEqual(400);
    });
    it('Lets everyone export an excel', async () => {
        const user = await prisma.user.create({ data: generateUser() });
        const start = faker.date.recent();
        const end = faker.date.between({ from: start, to: new Date(start.getTime() + 1000 * 60 * 60 * 24 * 180) });
        const semester = await prisma.semester.create({
            data: generateSemester({
                start: start,
                end: end,
                untisSyncDate: faker.date.between({ from: start, to: end }),
            })
        });
        for (var i = 0; i < 10; i++) {
            const estart = faker.date.between({ from: start, to: end });
            await prisma.event.create({
                data: generateEvent({
                    authorId: user.id,
                    start: estart,
                    end: faker.date.between({ from: estart, to: end }),
                    state: EventState.PUBLISHED,
                })
            });
        }

        const result = await request(app)
            .post(`${API_URL}/events/excel`);
        expect(result.statusCode).toEqual(200);
        expect(result.body).toEqual({});
    });
});


// describe('Export and reimport', () => {
//     afterEach(() => {
//         return truncate();
//     });
//     it('Exports and reimports the same events', async () => {
//         const admin = await prisma.user.create({
//             data: generateUser({ email: '
// })