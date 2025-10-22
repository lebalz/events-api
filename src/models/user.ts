import { EventState, Prisma, PrismaClient, Role, Subscription, User as Users } from '@prisma/client';
import { createIcs as createIcsFile } from '../services/createIcs';
import prisma from '../prisma';
import { HTTP400Error, HTTP403Error, HTTP404Error } from '../utils/errors/Errors';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { ApiEvent, prepareEvent } from './event.helpers';
import { createDataExtractor } from '../controllers/helpers';
import Logger from '../utils/logger';
import { DEFAULT_INCLUDE as SUBSCRIPTION_INCLUDE } from './subscription.helpers';
import { ApiUser, prepareUser } from './user.helpers';
const getData = createDataExtractor<Prisma.UserUncheckedUpdateInput>([
    'notifyOnEventUpdate',
    'notifyAdminOnReviewRequest',
    'notifyAdminOnReviewDecision'
]);

function Users(db: PrismaClient['user']) {
    return Object.assign(db, {
        /**
         * Signup the first user and create a new team of one. Return the User with
         * a full name and without a password
         */
        async findModel(id: string): Promise<ApiUser | null> {
            const user = await db.findUnique({
                where: { id },
                include: {
                    subscription: {
                        include: SUBSCRIPTION_INCLUDE
                    }
                }
            });
            if (!user) {
                return null;
            }
            return prepareUser(user);
        },
        async updateModel(actor: Users, id: string, data: Partial<Users>): Promise<ApiUser> {
            const record = await db.findUnique({ where: { id: id } });
            if (!record) {
                throw new HTTP404Error('User not found');
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
                data: sanitized,
                include: {
                    subscription: {
                        include: SUBSCRIPTION_INCLUDE
                    }
                }
            });
            return prepareUser(res);
        },
        async all(): Promise<Users[]> {
            return await db.findMany({});
        },
        async linkToUntis(actor: Users, userId: string, untisId: number | null): Promise<ApiUser> {
            if (actor.role !== Role.ADMIN && actor.id !== userId) {
                throw new HTTP403Error('Not authorized');
            }
            try {
                const res = await db.update({
                    where: {
                        id: userId
                    },
                    data: {
                        untisId: untisId || null
                    },
                    include: {
                        subscription: {
                            include: SUBSCRIPTION_INCLUDE
                        }
                    }
                });
                /* no need to await the result */
                createIcsFile(userId).catch((err) => {
                    Logger.error(`ICS-Sync after linking to untis failed for ${actor.email}: ${err.message}`);
                });
                return prepareUser(res);
            } catch (err) {
                Logger.error(`Linking to untis failed for ${actor.email}: ${JSON.stringify(err, null, 2)}`);
                const error = (err || {}) as PrismaClientKnownRequestError;
                if (error?.name === 'PrismaClientKnownRequestError' && error?.code === 'P2002') {
                    throw new HTTP400Error('Untis ID already in use');
                }
                /* istanbul ignore next */
                throw error;
            }
        },
        async setRole(actor: Users, userId: string, role: Role): Promise<Users> {
            if (actor.role !== Role.ADMIN) {
                throw new HTTP403Error('Not authorized');
            }
            return await db.update({
                where: {
                    id: userId
                },
                data: {
                    role: role
                }
            });
        },
        async createIcs(actor: Users, userId: string): Promise<ApiUser> {
            if (actor.id !== userId) {
                throw new HTTP403Error('Not authorized');
            }
            const subscription = await createIcsFile(userId);
            delete (subscription as any).userId; // remove redundant userId
            return {
                ...prepareUser({ ...actor, subscription: null }),
                subscription: subscription
            };
        },
        async affectedEvents(actor: Users, userId: string, semesterId?: string): Promise<ApiEvent[]> {
            if (actor.id !== userId && actor.role !== Role.ADMIN) {
                throw new HTTP403Error('Not authorized');
            }
            const user = await this.findModel(userId);
            if (!user) {
                throw new HTTP404Error('User not found');
            }
            const semester = semesterId
                ? await prisma.semester.findUnique({ where: { id: semesterId } })
                : await prisma.semester.findFirst({
                    where: {
                        AND: [{ start: { lte: new Date() } }, { end: { gte: new Date() } }]
                    }
                });
            if (!semester) {
                throw new HTTP404Error('Semester not found');
            }
            const events = await prisma.view_UsersAffectedByEvents.findMany({
                where: {
                    userId: user.id,
                    semesterId: semester.id,
                    parentId: null,
                    state: EventState.PUBLISHED
                }
            });
            return events.map((e) => prepareEvent(e));
        }
    });
}

export default Users(prisma.user);
