import { Prisma, PrismaClient, Role, Subscription, User as Users } from '@prisma/client';
import prisma from '../prisma';
import { HTTP403Error, HTTP404Error } from '../utils/errors/Errors';
import { createDataExtractor } from '../controllers/helpers';
import { ApiSubscription, DEFAULT_INCLUDE, prepareSubscription } from './subscription.helpers';
const getData = createDataExtractor<Partial<ApiSubscription>>(['subscribeToAffected']);

function Subscription(db: PrismaClient['subscription']) {
    return Object.assign(db, {
        async updateModel(
            actor: Users,
            id: string,
            data: Partial<ApiSubscription>
        ): Promise<ApiSubscription> {
            const record = await db.findUnique({ where: { id: id } });
            if (!record) {
                throw new HTTP404Error('Subscription not found');
            }
            if (!(record.id === actor.id || actor.role === Role.ADMIN)) {
                throw new HTTP403Error('Not authorized');
            }
            /** remove fields not updatable*/
            const sanitized = getData(data);
            const res = await db.update({
                where: {
                    id: id
                },
                data: {
                    ...sanitized,
                    departments: data.departmentIds
                        ? {
                              set: data.departmentIds.map((id) => ({ id }))
                          }
                        : undefined,
                    ignoredEvents: data.ignoredEventIds
                        ? {
                              set: data.ignoredEventIds.map((id) => ({ id }))
                          }
                        : undefined,
                    untisClasses: data.classIds
                        ? {
                              set: data.classIds.map((id) => ({ id }))
                          }
                        : undefined
                },
                include: DEFAULT_INCLUDE
            });
            return prepareSubscription(res);
        }
    });
}

export default Subscription(prisma.subscription);
