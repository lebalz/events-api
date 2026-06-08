import { Prisma, PrismaClient, RegistrationPeriod, User } from 'prisma/generated/client.js';
import prisma from 'src/prisma.js';
import { HTTP400Error, HTTP404Error } from '../utils/errors/Errors.js';
import { createDataExtractor } from '../controllers/helpers.js';

const getData = createDataExtractor<Prisma.RegistrationPeriodUncheckedUpdateInput>([
    'name',
    'start',
    'end',
    'description',
    'eventRangeEnd',
    'eventRangeStart',
    'isOpen'
]);

export const prepareRegistrationPeriod = (
    registrationPeriod: RegistrationPeriod & { departments?: { id: string }[] }
) => {
    const prepared = {
        ...registrationPeriod,
        departmentIds: registrationPeriod.departments?.map((rp) => rp.id) || []
    };
    if (prepared.departments) {
        delete prepared.departments;
    }
    return prepared;
};

const toDate = (value: unknown) => {
    if (value instanceof Date) {
        return value;
    }
    if (typeof value === 'string' || typeof value === 'number') {
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? null : date;
    }
    return null;
};

function RegistrationPeriods(db: PrismaClient['registrationPeriod']) {
    return Object.assign(db, {
        async all() {
            const records = await db.findMany({ include: { departments: { select: { id: true } } } });
            return records.map((r) => prepareRegistrationPeriod(r));
        },
        async findModel(id: string) {
            const model = await db.findUnique({
                where: { id },
                include: { departments: { select: { id: true } } }
            });

            if (!model) {
                throw new HTTP404Error('Registration Period not found');
            }
            return prepareRegistrationPeriod(model);
        },
        async openPeriods(forDate: Date, eventStartDate: Date, departmentIds: string[]) {
            const models1 = await db.findMany({
                where: {
                    OR: [
                        {
                            AND: [
                                { start: { lte: forDate } },
                                { end: { gte: forDate } },
                                { eventRangeStart: { lte: eventStartDate } },
                                { eventRangeEnd: { gte: eventStartDate } }
                            ]
                        },
                        { isOpen: true }
                    ]
                }
            });
            const models2 = await db.findMany({
                where: {
                    departments: { some: { id: { in: departmentIds } } }
                }
            });
            const models = await db.findMany({
                where: {
                    AND: [
                        {
                            OR: [
                                {
                                    AND: [
                                        { start: { lte: forDate } },
                                        { end: { gte: forDate } },
                                        { eventRangeStart: { lte: eventStartDate } },
                                        { eventRangeEnd: { gte: eventStartDate } }
                                    ]
                                },
                                { isOpen: true }
                            ]
                        },
                        { departments: { some: { id: { in: departmentIds } } } }
                    ]
                }
            });
            return models.map((rp) => prepareRegistrationPeriod(rp));
        },
        async createModel(data: Prisma.RegistrationPeriodUncheckedCreateInput) {
            /** authorization handled by route guard */
            const { start, end, name, eventRangeEnd, eventRangeStart } = data;
            if (toDate(start)! > toDate(end)!) {
                throw new HTTP400Error('Start date must be before end date');
            }
            const model = await db.create({
                data: {
                    start,
                    end,
                    name,
                    eventRangeStart,
                    eventRangeEnd
                }
            });
            return prepareRegistrationPeriod(model);
        },
        async updateModel(
            id: string,
            data: Prisma.RegistrationPeriodUncheckedUpdateInput & { departmentIds?: string[] }
        ) {
            /** authorization handled by route guard */
            /** remove fields not updatable*/
            const sanitized = getData(data);

            const current = await db.findUnique({ where: { id } });
            if (!current) {
                throw new HTTP404Error('Registration Period not found');
            }

            const nextStart = toDate(sanitized.start) ?? current.start;
            const nextEnd = toDate(sanitized.end) ?? current.end;
            if (nextStart > nextEnd) {
                throw new HTTP400Error('Start date must be before end date');
            }

            const model = await db.update({
                where: { id: id },
                data: {
                    ...sanitized,
                    departments: data.departmentIds
                        ? {
                            set: data.departmentIds.map((id) => ({ id }))
                        }
                        : undefined
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
    });
}

export default RegistrationPeriods(prisma.registrationPeriod);
