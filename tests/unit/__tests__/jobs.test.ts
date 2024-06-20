import { JobType, Prisma, Role, User } from '@prisma/client';
import Jobs from '../../../src/models/jobs';
import prisma from '../../../src/prisma';
import { createUser } from './users.test';
import { HTTP403Error, HTTP404Error } from '../../../src/utils/errors/Errors';
import { createEvent } from './events.test';
import Events from '../../../src/models/events';
import { prepareEvent } from '../../../src/models/event.helpers';
import { generateJob } from '../../factories/job';
import _ from 'lodash';

export const createJob = async (
    props: Partial<Prisma.JobUncheckedCreateInput> & { userId: string; type: 'IMPORT' }
) => {
    return await prisma.job.create({
        data: generateJob(props)
    });
};

describe('Jobs', () => {
    describe('find job', () => {
        test('find job', async () => {
            const user = await createUser({ firstName: 'Reto' });
            const job = await createJob({ userId: user.id, type: JobType.IMPORT });
            await expect(Jobs.findModel(user, job.id)).resolves.toEqual({
                ...job,
                events: []
            });
        });
        test('can not get other users job', async () => {
            const user = await createUser({ firstName: 'Reto' });
            const malory = await createUser({ firstName: 'Malory' });
            const job = await createJob({ userId: user.id, type: JobType.IMPORT });
            await expect(Jobs.findModel(malory, job.id)).rejects.toEqual(new HTTP403Error('Not authorized'));
        });
        test('admin can get other users job', async () => {
            const user = await createUser({ firstName: 'Reto' });
            const admin = await createUser({ role: Role.ADMIN });
            const job = await createJob({ userId: user.id, type: JobType.IMPORT });
            await expect(Jobs.findModel(admin, job.id)).resolves.toEqual({
                ...job,
                events: []
            });
        });
        test('throws on not existing record', async () => {
            const user = await createUser({ firstName: 'Reto' });
            await expect(Jobs.findModel(user, '1434b208-2a2c-40ab-9473-a0cd947e4fe4')).rejects.toEqual(
                new HTTP404Error('Job with id a4aa5e33-9041-4e09-8518-339e4d211c4f! not found')
            );
        });
    });
    describe('all jobs', () => {
        test('find all jobs', async () => {
            const user = await createUser({ firstName: 'Reto' });
            const job1 = await createJob({ userId: user.id, type: JobType.IMPORT });
            const job2 = await createJob({ userId: user.id, type: JobType.IMPORT });
            const jobs = await Jobs.all(user);
            expect(jobs).toHaveLength(2);
            expect(_.orderBy(jobs, ['id'])).toEqual(_.orderBy([job1, job2], ['id']));
        });

        test('find all jobs returns empty when no jobs are present', async () => {
            const user = await createUser({ firstName: 'Reto' });
            await expect(Jobs.all(user)).resolves.toEqual([]);
        });
    });

    describe('update job', () => {
        test('user can update description of own job', async () => {
            const user = await createUser({ firstName: 'Reto' });
            const job = await createJob({ userId: user.id, type: JobType.IMPORT });
            await expect(Jobs.updateModel(user, job.id, { description: 'FooBar' })).resolves.toEqual({
                ...job,
                events: [],
                description: 'FooBar',
                updatedAt: expect.any(Date)
            });
        });
        test('user can only update description', async () => {
            const user = await createUser({ firstName: 'Reto' });
            const job = await createJob({ userId: user.id, type: JobType.IMPORT });
            await expect(
                Jobs.updateModel(user, job.id, {
                    type: JobType.CLONE,
                    state: 'DONE',
                    log: 'Blaa',
                    filename: 'foobar.xlsx',
                    semesterId: 'sid',
                    userId: 'another-ones',
                    syncDate: new Date()
                })
            ).resolves.toEqual({
                ...job,
                events: []
            });
        });
        test('admin can update description of others jobs', async () => {
            const user = await createUser({ firstName: 'Reto' });
            const admin = await createUser({ role: Role.ADMIN });
            const job = await createJob({ userId: user.id, type: JobType.IMPORT });
            await expect(Jobs.updateModel(admin, job.id, { description: 'FooBar' })).resolves.toEqual({
                ...job,
                events: [],
                description: 'FooBar',
                updatedAt: expect.any(Date)
            });
        });
    });
    describe('destroy job', () => {
        test('user can destroy empty job', async () => {
            const user = await createUser({ firstName: 'Reto' });
            const job = await createJob({ userId: user.id, type: JobType.IMPORT });
            await expect(Jobs.destroy(user, job.id)).resolves.toEqual({ ...job, events: [] });
            await expect(Jobs.findModel(user, job.id)).rejects.toEqual(
                new HTTP404Error(`Job with id ${job.id} not found`)
            );
        });
        test('user can destroy job including connected draft events', async () => {
            const user = await createUser({ firstName: 'Reto' });
            const job = await createJob({ userId: user.id, type: JobType.IMPORT });
            const event1 = await createEvent({ authorId: user.id, jobId: job.id });
            const event2 = await createEvent({ authorId: user.id, jobId: job.id });
            await expect(Jobs.destroy(user, job.id)).resolves.toEqual({
                ...job,
                events: []
            });
            await expect(Jobs.findModel(user, job.id)).rejects.toEqual(
                new HTTP404Error(`Job with id ${job.id} not found`)
            );
            await expect(Events.findModel(user, event1.id)).rejects.toEqual(
                new HTTP404Error('Event not found')
            );
            await expect(Events.findModel(user, event2.id)).rejects.toEqual(
                new HTTP404Error('Event not found')
            );
        });
        test('user can not destroy job with published/reviewed/refused events', async () => {
            const user = await createUser({ firstName: 'Reto' });
            const job = await createJob({ userId: user.id, type: JobType.IMPORT });
            await createEvent({ authorId: user.id, jobId: job.id, state: 'DRAFT' });
            const reviewed = await createEvent({ authorId: user.id, jobId: job.id, state: 'REVIEW' });
            const refused = await createEvent({ authorId: user.id, jobId: job.id, state: 'REFUSED' });
            const published = await createEvent({ authorId: user.id, jobId: job.id, state: 'PUBLISHED' });
            const result = await Jobs.destroy(user, job.id);
            expect(result).toEqual({
                ...job,
                events: expect.any(Array)
            });
            expect(_.orderBy(result.events, ['id'])).toEqual(
                _.orderBy(
                    [
                        {
                            ...prepareEvent(reviewed),
                            deletedAt: expect.any(Date),
                            updatedAt: expect.any(Date)
                        },
                        {
                            ...prepareEvent(refused),
                            deletedAt: expect.any(Date),
                            updatedAt: expect.any(Date)
                        },
                        {
                            ...prepareEvent(published),
                            deletedAt: expect.any(Date),
                            updatedAt: expect.any(Date)
                        }
                    ],
                    ['id']
                )
            );
        });
    });
});
