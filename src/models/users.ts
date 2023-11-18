import { Event, EventState, PrismaClient, Role, User as Users } from "@prisma/client";
import { createIcs as createIcsFile} from '../services/createIcs';
import prisma from "../prisma";
import { HTTP400Error, HTTP403Error, HTTP404Error } from "../utils/errors/Errors";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { ApiEvent, prepareEvent } from "./event.helpers";
import { existsSync, rmSync } from "fs";
import { ICAL_DIR } from '../app';

function Users(db: PrismaClient['user']) {
    return Object.assign(db, {
        /**
         * Signup the first user and create a new team of one. Return the User with
         * a full name and without a password
         */
        async findModel(id: string): Promise<Users | null> {
            return await db.findUnique({ where: { id } });
        },
        async all(): Promise<Users[]> {
            return await db.findMany({});
        },
        async linkToUntis(actor: Users, userId: string, untisId: number | null): Promise<Users> {
            if (actor.role !== Role.ADMIN && actor.id !== userId) {
                throw new HTTP403Error('Not authorized');
            }
            const { icsLocator } = actor;
            try {
                const res = await db.update({
                    where: {
                        id: userId
                    },
                    data: {
                        untisId: untisId || null,
                        icsLocator: untisId ? (icsLocator || null) : null
                    }
                });
                if (untisId) {
                    try {
                        await createIcsFile(userId);
                    } catch (err) {
                        console.error(`ICS-Sync after linking to untis failed for ${actor.email}`, err);
                    }
                } else {
                    try {
                        if (existsSync(`${ICAL_DIR}/de/${icsLocator}`)) {
                            rmSync(`${ICAL_DIR}/de/${icsLocator}`);
                        }
                        if (existsSync(`${ICAL_DIR}/fr/${icsLocator}`)) {
                            rmSync(`${ICAL_DIR}/fr/${icsLocator}`);
                        }
                    } catch (err) {
                        console.error(`ICS-Sync after unlinking from untis failed for ${actor.email}`, err);
                    }
                }
                return res;
            } catch (err: unknown) {
                const error = err as PrismaClientKnownRequestError;
                if (error.name === 'PrismaClientKnownRequestError' && error.code === 'P2002') {
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
        async createIcs(actor: Users, userId: string): Promise<Users> {
            if (actor.id !== userId) {
                throw new HTTP403Error('Not authorized');
            }
            return await createIcsFile(userId);
        },
        async affectedEvents(actor: Users, userId: string, semesterId?: string): Promise<ApiEvent[]> {
            if (actor.id !== userId && actor.role !== Role.ADMIN) {
                throw new HTTP403Error('Not authorized');
            }
            const user = await this.findModel(userId);
            if (!user) {
                throw new HTTP404Error('User not found');
            }
            const semester = semesterId ? 
                await prisma.semester.findUnique({ where: { id: semesterId } }) :
                await prisma.semester.findFirst({ where: {
                    AND: [
                        { start: { lte: new Date() } },
                        { end: { gte: new Date() } }
                    ]
                }});
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
            return events.map(e => prepareEvent(e));
        }
    })
}

export default Users(prisma.user);