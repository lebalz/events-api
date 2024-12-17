import { Prisma, PrismaClient, Role, Subscription, User as UserModel, User as Users } from '@prisma/client';
import prisma from '../prisma';
import { HTTP403Error, HTTP404Error } from '../utils/errors/Errors';
import { createDataExtractor } from '../controllers/helpers';
import { createIcs as createIcsFile, createIcsFromSubscription } from '../services/createIcs';
import { ApiSubscription, DEFAULT_INCLUDE, prepareSubscription } from './subscription.helpers';
import User from './user';
import Logger from '../utils/logger';
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
        },

        async getOrCreateModel(actor: { id: string }): Promise<ApiSubscription> {
            const current = await User.findModel(actor.id);
            if (!current) {
                throw new HTTP404Error('User not found');
            }
            if (current.subscription) {
                return { ...current.subscription, userId: current.id };
            }
            const locator = await prisma.$queryRaw<
                { ics_locator: string }[]
            >`SELECT gen_random_uuid() ics_locator`;
            const fileName = `${locator[0].ics_locator}.ics`;

            const model = await db.create({
                data: {
                    userId: actor.id,
                    icsLocator: fileName
                },
                include: DEFAULT_INCLUDE
            });
            const subscription = prepareSubscription(model);
            await createIcsFromSubscription(subscription);
            return subscription;
        }
    });
}

export default Subscription(prisma.subscription);
