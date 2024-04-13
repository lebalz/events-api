import { Prisma, PrismaClient, RegistrationPeriod, Role, User } from "@prisma/client";
import prisma from "../prisma";
import { HTTP403Error, HTTP404Error } from "../utils/errors/Errors";
import { createDataExtractor } from "../controllers/helpers";

const getData = createDataExtractor<Prisma.RegistrationPeriodUncheckedUpdateInput>(
    ['name', 'start', 'end']
);

export const prepareRegistrationPeriod = (registrationPeriod: RegistrationPeriod & { departments?: { id: string }[]}) => {
    const prepared = {
        ...registrationPeriod,
        departmentIds: registrationPeriod.departments?.map((rp) => rp.id) || []
    }
    if (prepared.departments) {
        delete prepared.departments;
    }
    return prepared;
}

function RegistrationPeriods(db: PrismaClient['registrationPeriod']) {
    return Object.assign(db, {
        async all() {
            return await db.findMany({});
        },
        async findModel(id: string) {
            console.log('find rp', id)
            const model = await db.findUnique({ where: { id }, include: { departments: { select: { id: true }}} });

            if (!model) {
                throw new HTTP404Error('Registration Period not found');
            }
            return prepareRegistrationPeriod(model);
        },
        async createModel(actor: User, data: Prisma.RegistrationPeriodUncheckedCreateInput) {
            /** authorization handled by route guard */
            const { start, end, name } = data;
            const model = await db.create({
                data: {
                    start,
                    end,
                    name
                }
            });
            return prepareRegistrationPeriod(model);
        },
        async updateModel(actor: User, id: string, data: Prisma.SemesterUncheckedUpdateInput & { departmentIds?: string[]}) {
            /** authorization handled by route guard */
            /** remove fields not updatable*/
            const sanitized = getData(data);

            const model = await db.update({
                where: { id: id },
                data: {
                    ...sanitized,
                    departments: data.departmentIds ? {
                        set: data.departmentIds.map((id) => ({ id }))
                    } : undefined
                },
                include: {
                    departments: {
                        select: { id: true }
                    }
                }
            });
            return prepareRegistrationPeriod(model);
        },
        async destroy(actor: User, id: string) {
            /** authorization handled by route guard */
            return await db.delete({
                where: { id: id }
            });
        }
    })
}

export default RegistrationPeriods(prisma.registrationPeriod);