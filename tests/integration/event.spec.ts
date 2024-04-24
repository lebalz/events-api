import request from 'supertest';
import app, { API_URL } from '../../src/app';
import prisma from '../../src/prisma';
import { generateUser } from '../factories/user';
import { Event, EventAudience, EventState, JobState, Role, TeachingAffected } from '@prisma/client';
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
import { createDepartment } from '../unit/__tests__/departments.test';
import { createSemester } from '../unit/__tests__/semesters.test';
import { createRegistrationPeriod } from '../unit/__tests__/registrationPeriods.test';
import { generateUntisClass } from '../factories/untisClass';

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
    it("lets unauthorized user fetch all public events", async () => {
        const user = await prisma.user.create({
            data: generateUser({ email: 'foo@bar.ch' })
        });
        const between = { from: new Date(), to: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7 * 12) };
        const pubEvents = await Promise.all(eventSequence(user.id, 8, { state: EventState.PUBLISHED, between: between}).map(e => prisma.event.create({ data: e })));
        const pubDeletedEvents = await Promise.all(eventSequence(user.id, 2, { state: EventState.PUBLISHED, deletedAt: new Date(), between: between }).map(e => prisma.event.create({ data: e })));
        const draftEvents = await Promise.all(eventSequence(user.id, 3, { state: EventState.DRAFT, between: between }).map(e => prisma.event.create({ data: e })));
        const refusedEvents = await Promise.all(eventSequence(user.id, 2, { state: EventState.REFUSED, between: between }).map(e => prisma.event.create({ data: e })));
        const reviewEvents = await Promise.all(eventSequence(user.id, 4, { state: EventState.REVIEW, between: between }).map(e => prisma.event.create({ data: e })));
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
    it("lets caller specify ids to fetch", async () => {
        const user = await prisma.user.create({
            data: generateUser({ email: 'foo@bar.ch' })
        });
        const between = { from: new Date(), to: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7 * 12) };
        const pubEvents = await Promise.all(eventSequence(user.id, 8, { state: EventState.PUBLISHED, between: between}).map(e => prisma.event.create({ data: e })));
        const pubDeletedEvents = await Promise.all(eventSequence(user.id, 2, { state: EventState.PUBLISHED, deletedAt: new Date(), between: between }).map(e => prisma.event.create({ data: e })));
        const draftEvents = await Promise.all(eventSequence(user.id, 3, { state: EventState.DRAFT, between: between }).map(e => prisma.event.create({ data: e })));
        const refusedEvents = await Promise.all(eventSequence(user.id, 2, { state: EventState.REFUSED, between: between }).map(e => prisma.event.create({ data: e })));
        const reviewEvents = await Promise.all(eventSequence(user.id, 4, { state: EventState.REVIEW, between: between }).map(e => prisma.event.create({ data: e })));
        // public user will get only the public events
        const result = await request(app)
            .get(`${API_URL}/events?ids[]=${pubEvents[0].id}&ids[]=${pubEvents[1].id}&ids[]=${pubDeletedEvents[0].id}&ids[]=${draftEvents[0].id}`)
            .set('authorization', JSON.stringify({ noAuth: true }));
        expect(result.statusCode).toEqual(200);
        expect(result.body.length).toEqual(3);
        expect(result.body.map((e: any) => e.id).sort()).toEqual([pubEvents[0], pubEvents[1], pubDeletedEvents[0]].map(e => e.id).sort());
        
        // authenticated user will get personal events too
        const authResult = await request(app)
            .get(`${API_URL}/events?ids[]=${pubEvents[0].id}&ids[]=${pubEvents[1].id}&ids[]=${pubDeletedEvents[0].id}&ids[]=${draftEvents[0].id}`)
            .set('authorization', JSON.stringify({ email: user.email }));
        expect(authResult.statusCode).toEqual(200);
        expect(authResult.body.length).toEqual(4);
        expect(authResult.body.map((e: any) => e.id).sort()).toEqual([pubEvents[0], pubEvents[1], draftEvents[0], pubDeletedEvents[0]].map(e => e.id).sort());
    });
});


describe(`GET ${API_URL}/events/:id`, () => {
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
                    const gbsl = await createDepartment({name: 'GYMD'});
                    const event = await prisma.event.create({ data: generateEvent({ authorId: user.id, state: transition.from, departmentIds: [gbsl.id] }) });
                    const sem = await createSemester({start: faker.date.recent({refDate: event.start}), end: faker.date.future({refDate: event.end})});
                    const regPeriod = await createRegistrationPeriod({eventRangeStart: faker.date.recent({refDate: event.start}), departmentIds: [gbsl.id]});
            
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
                    const gbsl = await createDepartment({name: 'GYMD'});
                    const event = await prisma.event.create({ data: generateEvent({ authorId: user.id, state: transition.from, departmentIds: [gbsl.id] }) });
                    const sem = await createSemester({start: faker.date.recent({refDate: event.start}), end: faker.date.future({refDate: event.end})});
                    const regPeriod = await createRegistrationPeriod({eventRangeStart: faker.date.recent({refDate: event.start}), departmentIds: [gbsl.id]});

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

            expect(result.body[0].id).toEqual(event.id);

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
                message: { record: 'SEMESTER', semesterIds: [semester.id] },
                to: IoRoom.ALL
            });
            /* first the original event */
            expect(mNotification.mock.calls[1][0]).toEqual({
                event: IoEvent.CHANGED_STATE,
                message: { state: EventState.PUBLISHED, ids: [event.id] },
                to: IoRoom.ALL
            });
            /* then the previously published event */
            expect(mNotification.mock.calls[2][0]).toEqual({
                event: IoEvent.CHANGED_RECORD,
                message: { record: 'EVENT', id: edit3.id },
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

        expect(result.body[0].id).toEqual(event.id);

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
            message: { record: 'SEMESTER', semesterIds: [] },
            to: IoRoom.ALL
        });

        /* first the newly published version */
        expect(mNotification.mock.calls[1][0]).toEqual({
            event: IoEvent.CHANGED_STATE,
            message: { state: EventState.PUBLISHED, ids: [event.id] },
            to: IoRoom.ALL
        });
        /* second the previous original event */
        expect(mNotification.mock.calls[2][0]).toEqual({
            event: IoEvent.CHANGED_RECORD,
            message: { record: 'EVENT', id: edit3.id },
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
        const department = await prisma.department.create({data: generateDepartment({name: 'GYMD'})});
        const event = await prisma.event.create({ data: generateEvent({ authorId: user.id, state: EventState.PUBLISHED, departments: {connect: [{id: department.id}]} }) });
        const edit1 = await prisma.event.create({ data: generateEvent({ authorId: user.id, parentId: event.id, state: EventState.REVIEW }) });
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

        const updatedEvent = await prisma.event.findUnique({ where: { id: edit1.id }, include: {departments: true} });
        expect(updatedEvent?.departments).toHaveLength(1);

    });
});



describe(`POST ${API_URL}/events/import`, () => {
    beforeEach(async () => {        
        await prisma.department.create({data: generateDepartment({name: 'GYMD'})});
        await prisma.department.create({data: generateDepartment({name: 'GYMD/GYMF'})});
        await prisma.department.create({data: generateDepartment({name: 'GYMF'})});
        await prisma.department.create({data: generateDepartment({name: 'GYMF/GYMD'})});
        await prisma.department.create({data: generateDepartment({name: 'FMS'})});
        await prisma.department.create({data: generateDepartment({name: 'ECG'})});
        await prisma.department.create({data: generateDepartment({name: 'ECG/FMS'})});
        await prisma.department.create({data: generateDepartment({name: 'WMS'})});
        await prisma.department.create({data: generateDepartment({name: 'ESC'})});
        await prisma.department.create({data: generateDepartment({name: 'MSOP'})});
        await prisma.department.create({data: generateDepartment({name: 'Passerelle'})});
    });
    describe('GBSL Format: ?type=GBSL_XLSX', () => {
        it("lets admins import gbsl events: legacy format", async () => {
            const admin = await prisma.user.create({
                data: generateUser({ email: 'admin@bar.ch', role: Role.ADMIN })
            });

            const result = await request(app)
                .post(`${API_URL}/events/import?type=${ImportType.GBSL_XLSX}`)
                .set('authorization', JSON.stringify({ email: admin.email }))
                .attach('terminplan', `${__dirname}/stubs/terminplan-gbsl.xlsx`)
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
                message: { record: 'JOB', id: job.id },
                to: admin.id
            });

            expect(job.state).toEqual(JobState.DONE);
            expect(job.log).toEqual('');

            const events = await prisma.event.findMany({
                include: {
                    groups: {
                        select: {id: true}
                    },
                    departments: {
                        select: {id: true}
                    }
                }
            });
            expect(events.length).toEqual(4);
            events.forEach((e) => {
                expect(e.state).toEqual(EventState.DRAFT);
                expect(e.teachingAffected).toEqual(TeachingAffected.YES);
                expect(e.cloned).toBeFalsy();
                expect(e.jobId).toEqual(job.id);
                expect(e.parentId).toBeNull();
                expect(e.groups).toEqual([]);
                expect(e.audience).toBe(EventAudience.STUDENTS);
                expect(e.deletedAt).toBeNull();
                expect(e.start.getTime()).toBeLessThanOrEqual(e.end.getTime());
                expect(e.classGroups).toEqual([]);
            });
            const event1 = events.find(e => e.description === '1. Schultag gemäss Programm');
            expect(event1?.descriptionLong).toEqual('');
            expect(event1?.location).toEqual('GBSL');
            expect(event1?.start.toISOString()).toEqual('2023-08-21T00:00:00.000Z');
            expect(event1?.end.toISOString()).toEqual('2023-08-22T00:00:00.000Z');
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
            expect(event4?.end.toISOString()).toEqual('2023-09-02T00:00:00.000Z');
            expect(event4?.classes).toEqual(['26Wa']);
        });

        it("prevents users from importing events", async () => {
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

            const events = await prisma.event.findMany({
                include: {
                    groups: {
                        select: {id: true}
                    },
                    departments: {
                        select: {id: true}
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
            const event1 = events.find(e => e.description === 'Dispense');
            expect(event1?.descriptionLong).toEqual('Dispense de cours pour les élèves participant au concert de bienvenue');
            expect(event1?.location).toEqual('');
            expect(event1?.start.toISOString()).toEqual('2023-08-22T00:00:00.000Z');
            expect(event1?.end.toISOString()).toEqual('2023-08-23T00:00:00.000Z');
            expect(event1?.classes).toEqual([]);


            const event2 = events.find(e => e.description === 'début OC/EF');
            expect(event2?.descriptionLong).toEqual(`Classes GYM 3 et GYM4:\ndébut de l'enseignement des disciplines de l'OC, selon horaire`);
            expect(event2?.location).toEqual('');
            expect(event2?.start.toISOString()).toEqual('2023-08-25T14:55:00.000Z');
            expect(event2?.end.toISOString()).toEqual('2023-08-25T15:40:00.000Z');
            expect(event2?.classes).toEqual([]);

            const event3 = events.find(e => e.description === 'Présentation OP');
            expect(event3?.descriptionLong).toEqual(`Présentation des offres du GBJB autour de l'orientation professionnelle, à l'aula:\nClasses de GYM4 (24A à 24H et 24KL): 8h25-9h10\nClasses de GYM3 (25A à 25M et 25KL): 9h20-10h05\nClasses de GYM2 (26A à 26I et 26KLP): 11h20-12h05`);
            expect(event3?.location).toEqual('');
            expect(event3?.start.toISOString()).toEqual('2023-08-29T08:25:00.000Z');
            expect(event3?.end.toISOString()).toEqual('2023-08-29T12:05:00.000Z');
            expect(event3?.classes?.sort()).toEqual(['24mA', '24mH', '24mT', '24mU', '25mA', '25mM', '25mT', '25mU', '26mA', '26mI', '26mT', '26mU', '26mV'].sort());
        });

    });

    describe('V1 Format: ?type=V1', () => {
        beforeEach(async () => {
            for (const kl of ['25Ga', '25Gb', '25Gc', '25Gd', '25Ge', '25Gf', '25Gg', '25Gh', '25Gi']){
                await prisma.untisClass.create({
                    data: generateUntisClass({name: kl})
                })
            }
        })
        it("lets users import V1 events", async () => {
            const user = await prisma.user.create({
                data: generateUser({ email: 'user@bar.ch', role: Role.USER })
            });

            const result = await request(app)
                .post(`${API_URL}/events/import?type=${ImportType.V1}`)
                .set('authorization', JSON.stringify({ email: user.email }))
                .attach('terminplan', `${__dirname}/stubs/terminplan-v1.xlsx`)
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
                message: { record: 'JOB', id: job.id },
                to: user.id
            });

            expect(job.state).toEqual(JobState.DONE);
            expect(job.log).toEqual('');

            const events = await prisma.event.findMany({
                include: {
                    groups: {
                        select: {id: true}
                    },
                    departments: {
                        select: {id: true, name: true}
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
            const event1 = events.find(e => e.description === 'Nachbefragung in Klassenstunde: GYM3 Klassen')!;
            expect(event1.descriptionLong).toEqual('QE führt die Klassenstunde mit den einsprachigen Klassen des JG. 25 durch');
            expect(event1.location).toEqual('');
            expect(event1.start.toISOString()).toEqual('2024-02-26T00:00:00.000Z');
            expect(event1.end.toISOString()).toEqual('2024-03-02T00:00:00.000Z');
            expect(event1.classes.sort()).toEqual(['25Ga', '25Gb', '25Gc', '25Gd', '25Ge', '25Gf', '25Gg', '25Gh', '25Gi']);
            expect(event1.classGroups).toEqual([]);
            expect(event1.audience).toEqual(EventAudience.KLP);
            expect(event1.teachingAffected).toEqual(TeachingAffected.PARTIAL);
            expect(event1.affectsDepartment2).toBeFalsy();
            expect(event1.departments).toHaveLength(0);

            
            const event2 = events.find(e => e.description === 'Information Maturaarbeit')!;
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

            const event3 = events.find(e => e.description === 'Pfingsten: Frei')!;
            expect(event3.descriptionLong).toEqual('Pfingstmontag: Frei');
            expect(event3.location).toEqual('');
            expect(event3.start.toISOString()).toEqual('2024-05-20T00:00:00.000Z');
            expect(event3.end.toISOString()).toEqual('2024-05-21T00:00:00.000Z');
            expect(event3.classes).toEqual([]);
            expect(event3.classGroups).toEqual([]);
            expect(event3.departments.map(d => d.name).sort()).toEqual(['FMS', 'GYMD', 'GYMD/GYMF', 'WMS']);
            expect(event3.audience).toEqual(EventAudience.ALL);
            expect(event3.teachingAffected).toEqual(TeachingAffected.YES);
            expect(event3.affectsDepartment2).toBeFalsy();

            const event4 = events.find(e => e.description === 'Singen')!;
            expect(event4.descriptionLong).toEqual('Gemeinsam singen');
            expect(event4.location).toEqual('');
            expect(event4.start.toISOString()).toEqual('2024-05-21T00:00:00.000Z');
            expect(event4.end.toISOString()).toEqual('2024-05-22T00:00:00.000Z');
            expect(event4.classes.sort()).toEqual(['25Gb', '25Gc', '25Gd', '25Ge', '25Gf', '25Gg', '25Gi']);
            expect(event4.classGroups).toEqual([]);
            expect(event4.departments.map(d => d.name).sort()).toEqual([]);
            expect(event4.audience).toEqual(EventAudience.STUDENTS);
            expect(event4.teachingAffected).toEqual(TeachingAffected.YES);
            expect(event4.affectsDepartment2).toBeFalsy();
        });

        
        it("V1 import format handles column name mapping", async () => {
            const user = await prisma.user.create({
                data: generateUser({ email: 'user@bar.ch', role: Role.USER })
            });

            const result = await request(app)
                .post(`${API_URL}/events/import?type=${ImportType.V1}`)
                .set('authorization', JSON.stringify({ email: user.email }))
                .attach('terminplan', `${__dirname}/stubs/terminplan-v1-department-name-mapping.xlsx`)
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
                        select: {id: true}
                    },
                    departments: {
                        select: {id: true, name: true}
                    }
                }
            });
            expect(events.length).toEqual(1);
            const event3 = events.find(e => e.description === 'Pfingsten: Frei')!;
            expect(event3.descriptionLong).toEqual('Pfingstmontag: Frei');
            expect(event3.location).toEqual('');
            expect(event3.start.toISOString()).toEqual('2024-05-20T00:00:00.000Z');
            expect(event3.end.toISOString()).toEqual('2024-05-21T00:00:00.000Z');
            expect(event3.classes).toEqual([]);
            expect(event3.classGroups).toEqual([]);
            expect(event3.departments.map(d => d.name).sort()).toEqual(['FMS', 'GYMD', 'GYMD/GYMF', 'GYMF', 'GYMF/GYMD', 'WMS']);
            expect(event3.audience).toEqual(EventAudience.ALL);
            expect(event3.teachingAffected).toEqual(TeachingAffected.YES);
            expect(event3.affectsDepartment2).toBeFalsy();
        });

        it("V1 import format ignores missing columns", async () => {
            const user = await prisma.user.create({
                data: generateUser({ email: 'user@bar.ch', role: Role.USER })
            });

            const result = await request(app)
                .post(`${API_URL}/events/import?type=${ImportType.V1}`)
                .set('authorization', JSON.stringify({ email: user.email }))
                .attach('terminplan', `${__dirname}/stubs/terminplan-v1-missing-column.xlsx`)
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
                        select: {id: true}
                    },
                    departments: {
                        select: {id: true, name: true}
                    }
                }
            });
            expect(events.length).toEqual(1);
            const event3 = events.find(e => e.description === 'Pfingsten: Frei')!;
            expect(event3.descriptionLong).toEqual('Pfingstmontag: Frei');
            expect(event3.location).toEqual('');
            expect(event3.start.toISOString()).toEqual('2024-05-20T00:00:00.000Z');
            expect(event3.end.toISOString()).toEqual('2024-05-21T00:00:00.000Z');
            expect(event3.classes).toEqual([]);
            expect(event3.classGroups).toEqual([]);
            expect(event3.departments.map(d => d.name).sort()).toEqual(['FMS', 'GYMD', 'WMS']);
            expect(event3.audience).toEqual(EventAudience.ALL);
            expect(event3.teachingAffected).toEqual(TeachingAffected.YES);
            expect(event3.affectsDepartment2).toBeFalsy();
        });

        it("V1 import format respects 'excdluded classes'", async () => {
            /** create some classes */
            for (const kl of ['23Fa', '24Fa', '24Fb', '24Ga', '24Gi', '24mA', '24mB', '24mT']){
                await prisma.untisClass.create({
                    data: generateUntisClass({name: kl})
                })
            }

            const user = await prisma.user.create({
                data: generateUser({ email: 'user@bar.ch', role: Role.USER })
            });

            const result = await request(app)
                .post(`${API_URL}/events/import?type=${ImportType.V1}`)
                .set('authorization', JSON.stringify({ email: user.email }))
                .attach('terminplan', `${__dirname}/stubs/terminplan-v1-excludes.xlsx`)
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
                        select: {id: true}
                    },
                    departments: {
                        select: {id: true, name: true}
                    }
                }
            });
            expect(events.length).toEqual(1);

            const event4 = events.find(e => e.description === 'Singen')!;
            expect(event4.descriptionLong).toEqual('Gemeinsam singen');
            expect(event4.location).toEqual('');
            expect(event4.start.toISOString()).toEqual('2024-05-21T00:00:00.000Z');
            expect(event4.end.toISOString()).toEqual('2024-05-22T00:00:00.000Z');
            expect(event4.classes.sort()).toEqual(['24Fb', '24Ga', '24mA', '24mB','25Gb', '25Gc', '25Gd', '25Ge', '25Gf', '25Gg', '25Gi'].sort());
            expect(event4.classGroups).toEqual(['26m']);
            expect(event4.departments.map(d => d.name).sort()).toEqual([]);
            expect(event4.audience).toEqual(EventAudience.STUDENTS);
            expect(event4.teachingAffected).toEqual(TeachingAffected.YES);
            expect(event4.affectsDepartment2).toBeFalsy();
        });

        it("prevents users from importing events", async () => {
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
});