import { PrismaClient, User as Users } from 'prisma/generated/client.js';
import prisma from 'src/prisma.js';
import { HTTP403Error, HTTP404Error } from '../utils/errors/Errors.js';
import { createDataExtractor } from '../controllers/helpers.js';
import { createIcsFromSubscription } from '../services/createIcs.js';
import { ApiSubscription, DEFAULT_INCLUDE, prepareSubscription } from './subscription.helpers.js';
import User from './user.js';
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
            if (!(record.userId === actor.id || actor.role === 'admin')) {
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
                    untisClasses: data.untisClassIds
                        ? {
                            set: data.untisClassIds.map((id) => ({ id }))
                        }
                        : undefined
                },
                include: DEFAULT_INCLUDE
            });
            const subscription = prepareSubscription(res);
            /** no need to await the ics creation */
            createIcsFromSubscription(subscription);
            return subscription;
        },

        async getOrCreateModel(
            actor: { id: string },
            createIcs: boolean = true
        ): Promise<{ created: boolean; model: ApiSubscription }> {
            const current = await User.findModel(actor.id);
            if (!current) {
                throw new HTTP404Error('User not found');
            }
            if (current.subscription) {
                return {
                    created: false,
                    model: { ...current.subscription, userId: current.id }
                };
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
            if (createIcs) {
                await createIcsFromSubscription(subscription);
            }
            return {
                created: true,
                model: subscription
            };
        }
    });
}

export default Subscription(prisma.subscription);
