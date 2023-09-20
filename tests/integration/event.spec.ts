import request from 'supertest';
import app, { API_URL } from '../../src/app';
import prisma from '../../src/prisma';
import { generateUser } from '../factories/user';
import { Event, EventState, JobState, Role, TeachingAffected } from '@prisma/client';
import { truncate } from './helpers/db';
import Jobs from '../../src/models/jobs';
import { eventSequence, generateEvent } from '../factories/event';
import exp from 'constants';

const prepareEvent = (event: Event): any => {
    const prepared = {
        departmentIds: [],
        versionIds: [],
        ...event,
        start: event.start.toISOString(),
        end: event.end.toISOString(),
        updatedAt: event.updatedAt.toISOString(),
        createdAt: event.createdAt.toISOString()
    };
    return prepared;
}

describe(`POST ${API_URL}/event/import`, () => {
    afterEach(() => {
        return truncate();
    });
    it("lets admins import events", async () => {
        const admin = await prisma.user.create({
            data: generateUser({email: 'admin@bar.ch', role: Role.ADMIN})
        });

        const result = await request(app)
            .post(`${API_URL}/event/import`)
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
            expect(e.subjects).toEqual([]);
            expect(e.teachersOnly).toBeFalsy();
            expect(e.klpOnly).toBeFalsy();
            expect(e.deletedAt).toBeNull();
            expect(e.start.getTime()).toBeLessThanOrEqual(e.end.getTime());
            expect(e.classGroups).toEqual([]);
        });
        const event1 = events.find(e => e.description === '1. Schultag gemäss Programm');
        expect(event1?.descriptionLong).toEqual('');
        expect(event1?.location).toEqual('GBSL');
        expect(event1?.start.toISOString()).toEqual('2023-08-21T23:59:59.000Z');
        expect(event1?.end.toISOString()).toEqual('2023-08-21T23:59:59.000Z');
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
        expect(event3?.classes).toEqual([ '27Gw', '27Gx', '27mT', '27mU' ]);

        const event4 = events.find(e => e.description === 'Information IDAF 1 Geschichte / Französisch');
        expect(event4?.descriptionLong).toEqual('Die Lehrpersonen informieren die Klasse in einer der Lektionen über den Zeitpunkt und Ablauf des IDAF-Moduls');
        expect(event4?.location).toEqual('');
        expect(event4?.start.toISOString()).toEqual('2023-08-28T00:00:00.000Z');
        expect(event4?.end.toISOString()).toEqual('2023-09-01T23:59:59.000Z');
        expect(event4?.classes).toEqual([ '26Wa' ]);
    });

    it("prevents users from importing events", async () => {
        const user = await prisma.user.create({
            data: generateUser({email: 'foo@bar.ch'})
        });

        const result = await request(app)
            .post(`${API_URL}/event/import`)
            .set('authorization', JSON.stringify({ email: user.email }))
            .attach('terminplan', `${__dirname}/stubs/terminplan-import.xlsx`);
        expect(result.statusCode).toEqual(403);
    });
    it("lets logs failed import", async () => {
        const admin = await prisma.user.create({
            data: generateUser({email: 'admin@bar.ch', role: Role.ADMIN})
        });

        const result = await request(app)
            .post(`${API_URL}/event/import`)
            .set('authorization', JSON.stringify({ email: admin.email }))
            .attach('terminplan', `${__dirname}/stubs/terminplan-corrupted.xlsx`)
        expect(result.statusCode).toEqual(200);
        expect(result.body.state).toEqual(JobState.PENDING);
        expect(result.body.filename).toEqual('terminplan-corrupted.xlsx');
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
    });
});

describe(`GET ${API_URL}/event/all`, () => {
    afterEach(() => {
        return truncate();
    });
    it("lets unauthorized user fetch all public events", async () => {
        const user = await prisma.user.create({
            data: generateUser({email: 'foo@bar.ch'})
        });
        const pubEvents = await Promise.all(eventSequence(user.id, 8, {state: EventState.PUBLISHED}).map(e => prisma.event.create({data: e})));
        const pubDeletedEvents = await Promise.all(eventSequence(user.id, 2, {state: EventState.PUBLISHED, deletedAt: new Date()}).map(e => prisma.event.create({data: e})));
        const draftEvents = await Promise.all(eventSequence(user.id, 3, {state: EventState.DRAFT}).map(e => prisma.event.create({data: e})));
        const refusedEvents = await Promise.all(eventSequence(user.id, 2, {state: EventState.REFUSED}).map(e => prisma.event.create({data: e})));
        const reviewEvents = await Promise.all(eventSequence(user.id, 4, {state: EventState.REVIEW}).map(e => prisma.event.create({data: e})));
        const result = await request(app)
            .get(`${API_URL}/event/all`)
            .set('authorization', JSON.stringify({ noAuth: true }));
        expect(result.statusCode).toEqual(200);
        expect(result.body.length).toEqual(10);
        expect(result.body.map((e: any) => e.id).sort()).toEqual([...pubEvents, ...pubDeletedEvents].map(e => e.id).sort());
        pubDeletedEvents.forEach((e) => {
            const dEvent = result.body.find((r: any) => r.id === e.id);
            expect(dEvent.deletedAt).not.toBeNull();
        });
    });
    it("lets authorized user fetch all public and it's own events", async () => {
        const user = await prisma.user.create({
            data: generateUser({email: 'foo@bar.ch'})
        });
        const other = await prisma.user.create({
            data: generateUser({email: 'other@foo.ch'})
        });
        const pubEvents = await Promise.all(eventSequence(user.id, 10, {state: EventState.PUBLISHED}).map(e => prisma.event.create({data: e})));
        const draftEvents = await Promise.all(eventSequence(user.id, 3, {state: EventState.DRAFT}).map(e => prisma.event.create({data: e})));
        const refusedEvents = await Promise.all(eventSequence(user.id, 2, {state: EventState.REFUSED}).map(e => prisma.event.create({data: e})));
        const reviewEvents = await Promise.all(eventSequence(user.id, 4, {state: EventState.REVIEW}).map(e => prisma.event.create({data: e})));
        const refusedOtherEvents = await Promise.all(eventSequence(other.id, 5, {state: EventState.REFUSED}).map(e => prisma.event.create({data: e})));
        const reviewOtherEvents = await Promise.all(eventSequence(other.id, 5, {state: EventState.REVIEW}).map(e => prisma.event.create({data: e})));
        const all = await prisma.event.findMany();
        expect(all.length).toEqual(29);

        const result = await request(app)
            .get(`${API_URL}/event/all`)
            .set('authorization', JSON.stringify({ email: user.email }));
        expect(result.statusCode).toEqual(200);
        expect(result.body.length).toEqual(19);
        expect(result.body.map((e: any) => e.id).sort()).toEqual([...pubEvents, ...draftEvents, ...refusedEvents, ...reviewEvents].map(e => e.id).sort());
    });

    it("lets admins fetch all events of state public, review and refused", async () => {
        const user = await prisma.user.create({
            data: generateUser({email: 'foo@bar.ch'})
        });
        const admin = await prisma.user.create({
            data: generateUser({email: 'admin@foo.ch', role: Role.ADMIN})
        });
        const pubEvents = await Promise.all(eventSequence(user.id, 10, {state: EventState.PUBLISHED}).map(e => prisma.event.create({data: e})));
        const draftEvents = await Promise.all(eventSequence(user.id, 7, {state: EventState.DRAFT}).map(e => prisma.event.create({data: e})));
        const refusedEvents = await Promise.all(eventSequence(user.id, 2, {state: EventState.REFUSED}).map(e => prisma.event.create({data: e})));
        const reviewEvents = await Promise.all(eventSequence(user.id, 4, {state: EventState.REVIEW}).map(e => prisma.event.create({data: e})));
        const draftAdminEvents = await Promise.all(eventSequence(admin.id, 5, {state: EventState.DRAFT}).map(e => prisma.event.create({data: e})));
        const all = await prisma.event.findMany();
        expect(all.length).toEqual(28);

        const result = await request(app)
            .get(`${API_URL}/event/all`)
            .set('authorization', JSON.stringify({ email: admin.email }));
        expect(result.statusCode).toEqual(200);
        expect(result.body.length).toEqual(21);
        expect(result.body.map((e: any) => e.id).sort()).toEqual([...pubEvents, ...refusedEvents, ...reviewEvents, ...draftAdminEvents].map(e => e.id).sort());    
    });
});

describe(`GET ${API_URL}/event/:id`, () => {
    afterEach(() => {
        return truncate();
    });
    it("unauthorized user can not fetch public event", async () => {
        const user = await prisma.user.create({
            data: generateUser({email: 'foo@bar.ch'})
        });
        const event = await prisma.event.create({data: generateEvent({authorId: user.id, state: EventState.PUBLISHED})});
        const result = await request(app)
            .get(`${API_URL}/event/${event.id}`)
            .set('authorization', JSON.stringify({ noAuth: true }));
        expect(result.statusCode).toEqual(401);
    });
    it("authorized user can fetch public event", async () => {
        const user = await prisma.user.create({
            data: generateUser({email: 'foo@bar.ch'})
        });
        const other = await prisma.user.create({
            data: generateUser({email: 'other@foo.ch'})
        });
        const event = await prisma.event.create({data: generateEvent({authorId: other.id, state: EventState.PUBLISHED})});
        const result = await request(app)
            .get(`${API_URL}/event/${event.id}`)
            .set('authorization', JSON.stringify({ email: user.email }));
        expect(result.statusCode).toEqual(200);
        expect(result.body).toEqual(prepareEvent(event));
    });
});


describe(`PUT ${API_URL}/event/:id`, () => {
    afterEach(() => {
        return truncate();
    });
    it('Lets users update their own draft events', async () => {
        const user = await prisma.user.create({
            data: generateUser({email: 'foo@bar.ch'})
        });
        const event = await prisma.event.create({data: generateEvent({authorId: user.id, description: 'foo bar!'})});
        const result = await request(app)
            .put(`${API_URL}/event/${event.id}`)
            .set('authorization', JSON.stringify({ email: user.email }))
            .send({data: {description: 'Hoo Ray!'}});
        expect(result.statusCode).toEqual(200);
        expect(result.body).toEqual({
            ...prepareEvent(event),
            description: 'Hoo Ray!',
            updatedAt: expect.any(String)
        });
    });

    /** TODO: check that only accepted attributes are updated */
});


describe(`POST ${API_URL}/event`, () => {
    afterEach(() => {
        return truncate();
    });
    it('Lets users create a new draft', async () => {
        const user = await prisma.user.create({
            data: generateUser({email: 'foo@bar.ch'})
        });
        const before = await prisma.event.findMany();
        expect(before.length).toEqual(0);

        const result = await request(app)
            .post(`${API_URL}/event`)
            .set('authorization', JSON.stringify({ email: user.email }))
            .send({start: new Date('2023-09-20T08:25:00.000Z'), end: new Date('2023-09-20T09:10:00.000Z')});
        expect(result.statusCode).toEqual(201);
        expect(result.body.start).toEqual('2023-09-20T08:25:00.000Z');
        expect(result.body.end).toEqual('2023-09-20T09:10:00.000Z');
        expect(result.body.state).toEqual(EventState.DRAFT);

        const after = await prisma.event.findMany();
        expect(after.length).toEqual(1);
    });

    [EventState.PUBLISHED, EventState.REVIEW, EventState.REFUSED].forEach((state) => {
        it(`creates a draft even when a state is set to ${state}`, async () => {
            const user = await prisma.user.create({
                data: generateUser({email: 'foo@bar.ch'})
            });
        
            const result = await request(app)
                .post(`${API_URL}/event`)
                .set('authorization', JSON.stringify({ email: user.email }))
                .send({
                    start: new Date('2023-09-20T08:25:00.000Z'),
                    end: new Date('2023-09-20T09:10:00.000Z'),
                    state: state
                });
            expect(result.statusCode).toEqual(201);
            expect(result.body.state).toEqual(EventState.DRAFT);    
        });
    });
});


describe(`DELETE ${API_URL}/event/:id`, () => {
    afterEach(() => {
        return truncate();
    });

    it('Lets users delete their own draft events', async () => {
        const user = await prisma.user.create({
            data: generateUser({email: 'foo@bar.ch'})
        });
        const event = await prisma.event.create({data: generateEvent({authorId: user.id})});
        const result = await request(app)
            .delete(`${API_URL}/event/${event.id}`)
            .set('authorization', JSON.stringify({ email: user.email }));
        expect(result.statusCode).toEqual(204);
        const all = await prisma.event.findMany();
        expect(all.length).toEqual(0);
    });
    [EventState.PUBLISHED, EventState.REVIEW, EventState.REFUSED].forEach((state) => {
        it(`does a soft delete of an event with state ${state}`, async () => {
            const user = await prisma.user.create({
                data: generateUser({email: 'foo@bar.ch'})
            });
            const event = await prisma.event.create({data: generateEvent({authorId: user.id, state: state})});
            const result = await request(app)
                .delete(`${API_URL}/event/${event.id}`)
                .set('authorization', JSON.stringify({ email: user.email }));
            expect(result.statusCode).toEqual(204);
            const all = await prisma.event.findMany();
            expect(all.length).toEqual(1);

            const deleted = await prisma.event.findUnique({where: {id: event.id}});
            expect(deleted?.deletedAt).not.toBeNull();
        });
    });
});


describe(`POST ${API_URL}/event/:id/clone`, () => {
    afterEach(() => {
        return truncate();
    });

    it('Lets users clone events', async () => {
        const user = await prisma.user.create({
            data: generateUser({email: 'foo@bar.ch'})
        });
        const event = await prisma.event.create({data: generateEvent({authorId: user.id, description: 'foo bar!'})});
        const result = await request(app)
            .post(`${API_URL}/event/${event.id}/clone`)
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

    });

    it("Lets users clone other's published events", async () => {
        const other = await prisma.user.create({
            data: generateUser({email: 'other@bar.ch'})
        });
        const user = await prisma.user.create({
            data: generateUser({email: 'foo@bar.ch'})
        });
        const event = await prisma.event.create({data: generateEvent({authorId: other.id, description: 'foo bar!', state: EventState.PUBLISHED})});
        const result = await request(app)
            .post(`${API_URL}/event/${event.id}/clone`)
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
    });

    [EventState.DRAFT, EventState.REVIEW, EventState.REFUSED].forEach((state) => {
        it(`is forbidden for user to clone other's ${state} events`, async () => {
            const other = await prisma.user.create({
                data: generateUser({email: 'other@bar.ch'})
            });
            const user = await prisma.user.create({
                data: generateUser({email: 'foo@bar.ch'})
            });
            const event = await prisma.event.create({data: generateEvent({authorId: other.id, description: 'foo bar!', state: state})});
            const result = await request(app)
                .post(`${API_URL}/event/${event.id}/clone`)
                .set('authorization', JSON.stringify({ email: user.email }));
            expect(result.statusCode).toEqual(401);
            const all = await prisma.event.findMany();
            expect(all.length).toEqual(1);
        });
    });
});