import { JobState, Prisma, PrismaClient, Role, User } from "@prisma/client";
import prisma from "../prisma";
import { HTTP403Error, HTTP404Error } from "../utils/errors/Errors";
import { createDataExtractor } from "../controllers/helpers";
import Logger from "../utils/logger";
import Jobs from "./jobs";
import { syncUntis2DB } from "../services/syncUntis2DB";

const getData = createDataExtractor<Prisma.SemesterUncheckedUpdateInput>(
    ['name', 'start', 'end', 'untisSyncDate']
);

function Semesters(db: PrismaClient['semester']) {
    return Object.assign(db, {
        async all() {
            return await db.findMany({});
        },
        async findModel(id: string) {
            return db.findUnique({ where: { id } });
        },
        async createModel(actor: User, data: Prisma.SemesterUncheckedCreateInput) {
            const { name } = data;
            const start = new Date(data.start);
            const end = new Date(data.end);
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
            /** remove fields not updatable*/
            const sanitized = getData(data);    

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
            return db.delete({
                where: { id: id }
            });
        },
        async sync(actor: User, id: string, onComplete?: (jobId: string) => void) {
            const semester = await this.findModel(id);
            if (!semester) {
                throw new HTTP404Error('Semester not found');
            }
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