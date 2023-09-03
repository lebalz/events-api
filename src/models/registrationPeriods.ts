import { Prisma, PrismaClient, Role, User } from "@prisma/client";
import prisma from "../prisma";
import { HTTP403Error } from "../utils/errors/Errors";
import { createDataExtractor } from "../controllers/helpers";

const getData = createDataExtractor<Prisma.RegistrationPeriodUncheckedUpdateInput>(
    ['name', 'start', 'end']
);

function RegistrationPeriods(db: PrismaClient['registrationPeriod']) {
    return Object.assign(db, {
        async all() {
            return await db.findMany({});
        },
        async findModel(id: string) {
            return db.findUnique({ where: { id } });
        },
        async createModel(actor: User, data: Prisma.RegistrationPeriodUncheckedCreateInput) {
            const { start, end, name } = data;
            const model = await db.create({
                data: {
                    start,
                    end,
                    name
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
        }
    })
}

export default RegistrationPeriods(prisma.registrationPeriod);