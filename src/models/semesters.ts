import { JobState, Prisma, PrismaClient, Role, Semester, User } from "@prisma/client";
import prisma from "../prisma";
import { HTTP400Error, HTTP403Error, HTTP404Error } from "../utils/errors/Errors";
import { createDataExtractor } from "../controllers/helpers";
import Logger from "../utils/logger";
import Jobs from "./jobs";
import { syncUntis2DB } from "../services/syncUntis2DB";
import { DAY_2_MS, WEEK_2_MS } from "../services/createExcel";

const getData = createDataExtractor<Prisma.SemesterUncheckedUpdateInput>(
    ['name', 'start', 'end', 'untisSyncDate']
);

function Semesters(db: PrismaClient['semester']) {
    return Object.assign(db, {
        async all() {
            return await db.findMany({});
        },
        async current() {
            const curr = await db.findFirst({
                where: {
                    start: {
                        lte: new Date()
                    },
                    end: {
                        gte: new Date()
                    }
                }
            });
            if (curr) {
                return curr;
            }
            const defSem: Semester = {
                id: '00000000-0000-4000-8000-000000000000', /* valid dummy uuid */
                name: 'Default Semester',
                start: new Date((Date.now() - 12 * WEEK_2_MS)),
                end: new Date((Date.now() + 12 * WEEK_2_MS)),
                untisSyncDate: new Date(),
                createdAt: new Date(),
                updatedAt: new Date()
            };
            return Promise.resolve(defSem); 
        },
        async findModel(id: string) {
            const model = await db.findUnique({ where: { id } });
            if (!model) {
                throw new HTTP404Error(`Semester with id ${id} not found`);
            }
            return model;
        },
        async createModel(actor: User, data: {name: string, start: Date | string, end: Date | string}) {
            if (actor.role !== Role.ADMIN) {
                throw new HTTP403Error('Not authorized');
            }
            const { name } = data;
            const start = new Date(data.start);
            const end = new Date(data.end);
            if (start.getTime() >= end.getTime()) {
                throw new HTTP400Error('End date must be after start date');
            }
            const syncDate = new Date(start.getTime() + (end.getTime() - start.getTime()) / 2);
            const model = await db.create({
                data: {
                    start: start,
                    end: end,
                    name: name,
                    untisSyncDate: syncDate
                }
            });
            return model;
        },
        async updateModel(actor: User, id: string, data: Prisma.SemesterUncheckedUpdateInput) {
            if (actor.role !== Role.ADMIN) {
                throw new HTTP403Error('Not authorized');
            }
            const semester = await this.findModel(id);
            /** remove fields not updatable*/
            const sanitized = getData(data);
            const { start, end, untisSyncDate } = {...semester, ...sanitized};

            const nStart = new Date(start as string);
            const nEnd = new Date(end as string);
            const nSync = new Date(untisSyncDate as string);

            if (nStart.getTime() >= nEnd.getTime()) {
                throw new HTTP400Error('End date must be after start date');
            }
            if (nSync.getTime() < nStart.getTime() || nSync.getTime() > nEnd.getTime()) {
                throw new HTTP400Error('Sync date must be between start and end date');
            }

            const model = await db.update({
                where: { id: id },
                data: sanitized
            });
            return model;
        },
        async destroy(actor: User, id: string) {
            if (actor.role !== Role.ADMIN) {
                throw new HTTP403Error('Not authorized');
            }
            return await db.delete({
                where: { id: id }
            });
        },
        async sync(actor: User, id: string, onComplete?: (jobId: string) => void) {
            const semester = await this.findModel(id);
            Logger.info(semester.untisSyncDate);
            const syncJob = await Jobs._createSyncJob(actor, semester);
            /** start async untis synchronisation */
            syncUntis2DB(id).then((summary) => {
                return Jobs._completeJob(syncJob, JobState.DONE, JSON.stringify(summary));
            }).catch((error) => {
                Logger.error(error);
                return Jobs._completeJob(syncJob, JobState.ERROR, JSON.stringify(error, Object.getOwnPropertyNames(error)));
            }).finally(() => {
                if (onComplete) {
                    onComplete(syncJob.id);
                }
            });
            return syncJob;
        }
    })
}

export default Semesters(prisma.semester);