import { JobState, JobType, Job as JobModel, Prisma, PrismaClient, Semester, User } from 'prisma/generated/client.js';
import prisma from 'src/prisma.js';
import { HTTP403Error, HTTP404Error } from '../utils/errors/Errors.js';
import { createDataExtractor } from '../controllers/helpers.js';
import { prepareEvent } from './event.helpers.js';
import Events from './event.js';
import { Role } from './user.js';

const PROPS: (keyof Prisma.JobUncheckedUpdateInput)[] = ['description'];
const ADMIN_PROPS: (keyof Prisma.JobUncheckedUpdateInput)[] = [...PROPS, 'state'];

const getData = createDataExtractor<Prisma.JobUncheckedUpdateInput>(PROPS);
const getAdminData = createDataExtractor<Prisma.JobUncheckedUpdateInput>(ADMIN_PROPS);

function Jobs(db: PrismaClient['job']) {
    return Object.assign(db, {
        async findModel(actor: User, id: string) {
            const job = await db.findUnique({
                where: { id: id },
                include: {
                    events: {
                        include: {
                            departments: true,
                            children: true,
                            linkedUsers: { select: { id: true } }
                        }
                    }
                }
            });
            if (!job) {
                throw new HTTP404Error(`Job with id ${id} not found`);
            }
            if (job?.userId !== actor.id && actor.role !== Role.ADMIN) {
                throw new HTTP403Error('Not authorized');
            }
            const events = job.events.map(prepareEvent);
            return {
                ...job,
                events: events
            };
        },
        async all(actor: User) {
            const models = await db.findMany({
                where: { userId: actor.id }
            });
            return models;
        },
        async updateModel(actor: User, id: string, data: Prisma.JobUncheckedUpdateInput) {
            /** ensure all permissions are correct */
            await this.findModel(actor, id);
            const sanitized = actor.role === Role.ADMIN ? getAdminData(data) : getData(data);
            const model = await db.update({
                where: {
                    id: id
                },
                data: sanitized,
                include: { events: true }
            });
            return model;
        },
        async destroy(actor: User, id: string) {
            const job = await this.findModel(actor, id);
            if (job.events.length > 0) {
                const destroyEvents = job.events.map((e) =>
                    Events._forceDestroy(e, { unlinkFromJob: false })
                );
                await Promise.all(destroyEvents);
                const cleanedUp = await this.findModel(actor, id);
                if (cleanedUp.events.length === 0) {
                    return await db.delete({ where: { id: id }, include: { events: true } });
                } else {
                    return cleanedUp;
                }
            } else {
                return await db.delete({ where: { id: id }, include: { events: true } });
            }
        },
        async _createSyncJob(user: User, semester: Semester) {
            const job = await db.create({
                data: {
                    type: JobType.SYNC_UNTIS,
                    user: { connect: { id: user.id } },
                    syncDate: new Date(semester.untisSyncDate ?? new Date()),
                    semester: { connect: { id: semester.id } }
                }
            });
            return job;
        },
        async _completeJob(job: JobModel, state: JobState, log: string) {
            return await db.update({
                where: { id: job.id },
                data: {
                    state: state,
                    log: log
                }
            });
        }
    });
}

export default Jobs(prisma.job);
