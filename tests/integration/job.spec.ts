import request from 'supertest';
import app, { API_URL } from '../../src/app';
import prisma from '../../src/prisma';
import { generateUser } from '../factories/user';
import { generateImportJob, generateSyncJob, jobSequence } from '../factories/job';
import { generateSemester } from '../factories/semester';
import { Event, EventState, Job, Prisma } from '@prisma/client';
import { eventSequence } from '../factories/event';
import { notify } from '../../src/middlewares/notify.nop';
import { IoEvent } from '../../src/routes/socketEventTypes';
import { IoRoom } from '../../src/routes/socketEvents';
import { prepareRecord } from '../helpers/prepareRecord';

jest.mock('../../src/middlewares/notify.nop');
const mNotification = <jest.Mock<typeof notify>>notify;

const prepareJob = (job: Job, includeEvents: boolean = false) => {
    if (includeEvents) {
        return {
            events: [],
            ...JSON.parse(JSON.stringify(job))
        };
    }
    return JSON.parse(JSON.stringify(job));
};

describe(`GET ${API_URL}/jobs`, () => {
    it('throws an error if visitor is not authenticated', async () => {
        const result = await request(app).get(`${API_URL}/jobs`);
        expect(result.statusCode).toEqual(401);
        expect(mNotification).toHaveBeenCalledTimes(0);
    });

    it('returns all jobs from user', async () => {
        const user = await prisma.user.create({ data: generateUser() });
        const other = await prisma.user.create({ data: generateUser() });
        const semester = await prisma.semester.create({ data: generateSemester() });
        const importJobs = await Promise.all(
            jobSequence(5, { userId: user.id, type: 'IMPORT' }).map((job) => prisma.job.create({ data: job }))
        );
        const syncJobs = await Promise.all(
            jobSequence(5, { userId: user.id, type: 'SYNC_UNTIS', semesterId: semester.id }).map((job) =>
                prisma.job.create({ data: job })
            )
        );

        const importJobsOther = await Promise.all(
            jobSequence(2, { userId: other.id, type: 'IMPORT' }).map((job) =>
                prisma.job.create({ data: job })
            )
        );
        const syncJobsOther = await Promise.all(
            jobSequence(2, { userId: other.id, type: 'SYNC_UNTIS', semesterId: semester.id }).map((job) =>
                prisma.job.create({ data: job })
            )
        );

        const result = await request(app)
            .get(`${API_URL}/jobs`)
            .set('authorization', JSON.stringify({ email: user.email }));
        expect(result.statusCode).toEqual(200);
        expect(result.body.length).toEqual(10);
        expect(result.body.map((e: any) => e.id).sort()).toEqual(
            [...importJobs, ...syncJobs].map((e) => e.id).sort()
        );
        expect(mNotification).toHaveBeenCalledTimes(0);
    });
});

describe(`GET ${API_URL}/jobs/:id`, () => {
    it('throws an error when visitor is not authenticated', async () => {
        const user = await prisma.user.create({ data: generateUser() });
        const job = await prisma.job.create({ data: generateImportJob({ userId: user.id }) });
        const result = await request(app).get(`${API_URL}/jobs/${job.id}`);
        expect(result.statusCode).toEqual(401);
        expect(mNotification).toHaveBeenCalledTimes(0);
    });

    it('returns job from user', async () => {
        const user = await prisma.user.create({ data: generateUser() });
        const job = await prisma.job.create({ data: generateImportJob({ userId: user.id }) });
        const result = await request(app)
            .get(`${API_URL}/jobs/${job.id}`)
            .set('authorization', JSON.stringify({ email: user.email }));
        expect(result.statusCode).toEqual(200);
        expect(result.body).toEqual(prepareJob(job, true));
        expect(mNotification).toHaveBeenCalledTimes(0);
    });

    it('throws when job is not found', async () => {
        const user = await prisma.user.create({ data: generateUser() });
        const job = await prisma.job.create({ data: generateImportJob({ userId: user.id }) });
        const result = await request(app)
            .get(`${API_URL}/jobs/efce93f5-0ead-4d5d-8143-0fd7267db689`)
            .set('authorization', JSON.stringify({ email: user.email }));
        expect(result.statusCode).toEqual(404);
        expect(result.body).toEqual({});
        expect(mNotification).toHaveBeenCalledTimes(0);
    });

    it('prevents user from getting others jobs', async () => {
        const user = await prisma.user.create({ data: generateUser() });
        const other = await prisma.user.create({ data: generateUser() });
        const job = await prisma.job.create({ data: generateImportJob({ userId: other.id }) });
        const result = await request(app)
            .get(`${API_URL}/jobs/${job.id}`)
            .set('authorization', JSON.stringify({ email: user.email }));
        expect(result.statusCode).toEqual(403);
        expect(mNotification).toHaveBeenCalledTimes(0);
    });

    it('admin can get others jobs', async () => {
        const admin = await prisma.user.create({ data: generateUser({ role: 'ADMIN' }) });
        const other = await prisma.user.create({ data: generateUser() });
        const job = await prisma.job.create({ data: generateImportJob({ userId: other.id }) });
        const result = await request(app)
            .get(`${API_URL}/jobs/${job.id}`)
            .set('authorization', JSON.stringify({ email: admin.email }));
        expect(result.statusCode).toEqual(200);
        expect(result.body).toEqual(prepareJob(job, true));
        expect(mNotification).toHaveBeenCalledTimes(0);
    });
});

describe(`PUT ${API_URL}/jobs/:id`, () => {
    it('throws an error when user is not authenticated', async () => {
        const user = await prisma.user.create({ data: generateUser() });
        const job = await prisma.job.create({ data: generateImportJob({ userId: user.id }) });
        const result = await request(app)
            .put(`${API_URL}/jobs/${job.id}`)
            .send({ data: { description: 'Foo' } });
        expect(result.statusCode).toEqual(401);
        expect(mNotification).toHaveBeenCalledTimes(0);
    });

    it('allows user to update description', async () => {
        const user = await prisma.user.create({ data: generateUser() });
        const job = await prisma.job.create({
            data: generateImportJob({ userId: user.id, description: 'Bar' })
        });
        const result = await request(app)
            .put(`${API_URL}/jobs/${job.id}`)
            .set('authorization', JSON.stringify({ email: user.email }))
            .send({ data: { description: 'Foo' } });
        expect(result.statusCode).toEqual(200);
        expect(result.body).toEqual({
            ...prepareJob(
                {
                    ...job,
                    description: 'Foo'
                },
                true
            ),
            updatedAt: expect.any(String)
        });
        expect(mNotification).toHaveBeenCalledTimes(1);
        expect(mNotification.mock.calls[0][0]).toEqual({
            event: IoEvent.CHANGED_RECORD,
            message: { type: 'JOB', record: prepareRecord(result.body) },
            to: user.id
        });
    });

    it('allows admins to update description and state', async () => {
        const admin = await prisma.user.create({ data: generateUser({ role: 'ADMIN' }) });
        const job = await prisma.job.create({
            data: generateImportJob({ userId: admin.id, description: 'Bar', state: 'PENDING' })
        });
        const result = await request(app)
            .put(`${API_URL}/jobs/${job.id}`)
            .set('authorization', JSON.stringify({ email: admin.email }))
            .send({ data: { description: 'Canceled', state: 'ERROR' } });
        expect(result.statusCode).toEqual(200);
        expect(result.body).toEqual({
            ...prepareJob(
                {
                    ...job,
                    description: 'Canceled',
                    state: 'ERROR'
                },
                true
            ),
            updatedAt: expect.any(String)
        });
        expect(mNotification).toHaveBeenCalledTimes(1);
        expect(mNotification.mock.calls[0][0]).toEqual({
            event: IoEvent.CHANGED_RECORD,
            message: { type: 'JOB', record: prepareRecord(result.body) },
            to: admin.id
        });
    });

    it('notifys everyone when job has public events', async () => {
        const user = await prisma.user.create({ data: generateUser() });
        const job = await prisma.job.create({
            data: generateImportJob({
                userId: user.id,
                description: 'Bar',
                events: { create: eventSequence(user.id, 3, { state: EventState.PUBLISHED }) }
            })
        });
        const result = await request(app)
            .put(`${API_URL}/jobs/${job.id}`)
            .set('authorization', JSON.stringify({ email: user.email }))
            .send({ data: { description: 'Foo' } });
        expect(result.statusCode).toEqual(200);
        expect(result.body.description).toEqual('Foo');
        expect(mNotification).toHaveBeenCalledTimes(1);
        expect(mNotification.mock.calls[0][0]).toEqual({
            event: IoEvent.CHANGED_RECORD,
            message: {
                type: 'JOB',
                record: prepareRecord(result.body as Job & { events: Event[] }, {
                    fn: (job) => ({
                        ...job,
                        events: job.events.map((e) =>
                            prepareRecord(e, { dateFields: ['start', 'end', 'createdAt', 'updatedAt'] })
                        )
                    })
                })
            },
            to: IoRoom.ALL
        });
    });

    [EventState.REFUSED, EventState.REVIEW].forEach((state) => {
        it(`notifys admins when job has ${state} events`, async () => {
            const user = await prisma.user.create({ data: generateUser() });
            const job = await prisma.job.create({
                data: generateImportJob({
                    userId: user.id,
                    description: 'Bar',
                    events: { create: eventSequence(user.id, 3, { state: state }) }
                })
            });
            const result = await request(app)
                .put(`${API_URL}/jobs/${job.id}`)
                .set('authorization', JSON.stringify({ email: user.email }))
                .send({ data: { description: 'Foo' } });
            expect(result.statusCode).toEqual(200);
            expect(result.body.description).toEqual('Foo');
            expect(mNotification).toHaveBeenCalledTimes(1);
            expect(mNotification.mock.calls[0][0]).toEqual({
                event: IoEvent.CHANGED_RECORD,
                message: {
                    type: 'JOB',
                    record: prepareRecord(result.body as Job & { events: Event[] }, {
                        fn: (job) => ({
                            ...job,
                            events: job.events.map((e) =>
                                prepareRecord(e, { dateFields: ['start', 'end', 'createdAt', 'updatedAt'] })
                            )
                        })
                    })
                },
                to: IoRoom.ADMIN
            });
        });
    });

    it('notifys user when job has only draft events', async () => {
        const user = await prisma.user.create({ data: generateUser() });
        const job = await prisma.job.create({
            data: generateImportJob({
                userId: user.id,
                description: 'Bar',
                events: { create: eventSequence(user.id, 3, { state: EventState.DRAFT }) }
            })
        });
        const result = await request(app)
            .put(`${API_URL}/jobs/${job.id}`)
            .set('authorization', JSON.stringify({ email: user.email }))
            .send({ data: { description: 'Foo' } });
        expect(result.statusCode).toEqual(200);
        expect(result.body.description).toEqual('Foo');
        expect(mNotification).toHaveBeenCalledTimes(1);
        expect(mNotification.mock.calls[0][0]).toEqual({
            event: IoEvent.CHANGED_RECORD,
            message: {
                type: 'JOB',
                record: prepareRecord(result.body as Job & { events: Event[] }, {
                    fn: (job) => ({
                        ...job,
                        events: job.events.map((e) =>
                            prepareRecord(e, { dateFields: ['start', 'end', 'createdAt', 'updatedAt'] })
                        )
                    })
                })
            },
            to: user.id
        });
    });

    it("fields other than 'description' are ignored for users", async () => {
        const other = await prisma.user.create({ data: generateUser() });
        const semester = await prisma.semester.create({ data: generateSemester() });

        const user = await prisma.user.create({ data: generateUser() });
        const job = await prisma.job.create({
            data: generateImportJob({ userId: user.id, description: 'Bar' })
        });
        const result = await request(app)
            .put(`${API_URL}/jobs/${job.id}`)
            .set('authorization', JSON.stringify({ email: user.email }))
            .send({
                data: {
                    ...generateSyncJob({ userId: other.id, semesterId: semester.id }),
                    description: 'Foo'
                }
            });
        expect(result.body).toEqual({
            ...prepareJob(
                {
                    ...job,
                    description: 'Foo'
                },
                true
            ),
            updatedAt: expect.any(String)
        });
        expect(mNotification).toHaveBeenCalledTimes(1);
        expect(mNotification.mock.calls[0][0]).toEqual({
            event: IoEvent.CHANGED_RECORD,
            message: { type: 'JOB', record: prepareRecord(result.body) },
            to: user.id
        });
    });

    it("fields other than 'description' and 'state' are ignored for admins", async () => {
        const other = await prisma.user.create({ data: generateUser() });
        const semester = await prisma.semester.create({ data: generateSemester() });

        const admin = await prisma.user.create({ data: generateUser({ role: 'ADMIN' }) });
        const job = await prisma.job.create({
            data: generateImportJob({ userId: admin.id, description: 'Bar', state: 'PENDING' })
        });
        const result = await request(app)
            .put(`${API_URL}/jobs/${job.id}`)
            .set('authorization', JSON.stringify({ email: admin.email }))
            .send({
                data: {
                    ...generateSyncJob({ userId: other.id, semesterId: semester.id, state: 'DONE' }),
                    description: 'Foo'
                }
            });
        expect(result.body).toEqual({
            ...prepareJob(
                {
                    ...job,
                    description: 'Foo',
                    state: 'DONE'
                },
                true
            ),
            updatedAt: expect.any(String)
        });
        expect(mNotification).toHaveBeenCalledTimes(1);
        expect(mNotification.mock.calls[0][0]).toEqual({
            event: IoEvent.CHANGED_RECORD,
            message: { type: 'JOB', record: prepareRecord(result.body) },
            to: admin.id
        });
    });
});

describe(`DELETE ${API_URL}/jobs/:id`, () => {
    it('throws an error when user is not authenticated', async () => {
        const user = await prisma.user.create({ data: generateUser() });
        const job = await prisma.job.create({ data: generateImportJob({ userId: user.id }) });
        const result = await request(app).delete(`${API_URL}/jobs/${job.id}`);
        expect(result.statusCode).toEqual(401);
        expect(mNotification).toHaveBeenCalledTimes(0);
    });

    it('allows user to delete a job', async () => {
        const user = await prisma.user.create({ data: generateUser() });
        const job = await prisma.job.create({
            data: generateImportJob({ userId: user.id, description: 'Bar' })
        });
        const result = await request(app)
            .delete(`${API_URL}/jobs/${job.id}`)
            .set('authorization', JSON.stringify({ email: user.email }));

        expect(result.statusCode).toEqual(204);
        const del = prisma.job.findUnique({ where: { id: job.id } });
        expect(del).resolves.toBeNull();
        expect(mNotification).toHaveBeenCalledTimes(1);
        expect(mNotification.mock.calls[0][0]).toEqual({
            event: IoEvent.DELETED_RECORD,
            message: { type: 'JOB', id: job.id },
            to: user.id
        });
    });

    it('jobs with draft-events will be deleted, including the events', async () => {
        const user = await prisma.user.create({ data: generateUser() });
        const job = await prisma.job.create({
            data: {
                ...generateImportJob({
                    userId: user.id,
                    description: 'Bar'
                }),
                events: {
                    create: eventSequence(user.id, 2)
                }
            }
        });
        const events = await prisma.event.findMany();
        expect(events).toHaveLength(2);

        const result = await request(app)
            .delete(`${API_URL}/jobs/${job.id}`)
            .set('authorization', JSON.stringify({ email: user.email }));
        expect(mNotification).toHaveBeenCalledTimes(1);
        expect(mNotification.mock.calls[0][0]).toEqual({
            event: IoEvent.DELETED_RECORD,
            message: { type: 'JOB', id: job.id },
            to: user.id
        });

        expect(result.statusCode).toEqual(204);
        const del = await prisma.job.findUnique({ where: { id: job.id } });
        expect(del).toBeNull();
        const delEvents = await prisma.event.findMany();
        expect(delEvents).toHaveLength(0);
    });

    it('does not delete jobs containing events[PUBLISHED, REVIEW, REFUSED]', async () => {
        const user = await prisma.user.create({ data: generateUser() });
        const job = await prisma.job.create({
            data: {
                ...generateImportJob({
                    userId: user.id,
                    description: 'Bar'
                }),
                events: {
                    create: [
                        ...eventSequence(user.id, 2, { state: EventState.DRAFT }),
                        ...eventSequence(user.id, 2, { state: EventState.PUBLISHED }),
                        ...eventSequence(user.id, 2, { state: EventState.REFUSED }),
                        ...eventSequence(user.id, 2, { state: EventState.REVIEW })
                    ]
                }
            }
        });
        const events = await prisma.event.findMany();
        expect(events).toHaveLength(8);

        const result = await request(app)
            .delete(`${API_URL}/jobs/${job.id}`)
            .set('authorization', JSON.stringify({ email: user.email }));
        expect(result.statusCode).toEqual(204);
        expect(mNotification).toHaveBeenCalledTimes(1);
        expect(mNotification.mock.calls[0][0]).toEqual({
            event: IoEvent.DELETED_RECORD,
            message: { type: 'JOB', id: job.id },
            to: IoRoom.ALL
        });

        const del = await prisma.job.findUnique({ where: { id: job.id } });
        const delEvents = await prisma.event.findMany();
        expect(delEvents).toHaveLength(6);
        expect(del).toEqual(job);
    });

    it('is idempotent', async () => {
        const user = await prisma.user.create({ data: generateUser() });
        const job = await prisma.job.create({
            data: generateImportJob({ userId: user.id, description: 'Bar' })
        });
        const result = await request(app)
            .delete(`${API_URL}/jobs/${job.id}`)
            .set('authorization', JSON.stringify({ email: user.email }));

        expect(mNotification).toHaveBeenCalledTimes(1);
        expect(mNotification.mock.calls[0][0]).toEqual({
            event: IoEvent.DELETED_RECORD,
            message: { type: 'JOB', id: job.id },
            to: user.id
        });
        mNotification.mockReset();
        expect(result.statusCode).toEqual(204);
        const del = await prisma.job.findUnique({ where: { id: job.id } });
        expect(del).toBeNull();

        const result2 = await request(app)
            .delete(`${API_URL}/jobs/${job.id}`)
            .set('authorization', JSON.stringify({ email: user.email }));
        expect(mNotification).toHaveBeenCalledTimes(0);

        expect(result2.statusCode).toEqual(204);
    });
});
