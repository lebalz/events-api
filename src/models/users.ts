import { Event, PrismaClient, Role, User as Users } from "@prisma/client";
import {default as createIcsFile} from '../services/createIcs';
import { default as queryAffectedEvents} from "../services/assets/query.eventsAffectingUser";
import prisma from "../prisma";
import { HTTP403Error, HTTP404Error } from "../utils/errors/Errors";

function Users(db: PrismaClient['user']) {
    return Object.assign(db, {
        /**
         * Signup the first user and create a new team of one. Return the User with
         * a full name and without a password
         */
        async findModel(id: string): Promise<Users | null> {
            return db.findUnique({ where: { id } });
        },
        async all(): Promise<Users[]> {
            return db.findMany({});
        },
        async linkToUntis(actor: Users, userId: string, untisId: number | null): Promise<Users> {
            if (actor.role !== Role.ADMIN && actor.id !== userId) {
                throw new HTTP403Error('Not authorized');
            }
            return db.update({
                where: {
                    id: userId
                },
                data: {
                    untisId: untisId || null
                }
            });
        },
        async setRole(actor: Users, userId: string, role: Role): Promise<Users> {
            if (actor.role !== Role.ADMIN) {
                throw new HTTP403Error('Not authorized');
            }
            return db.update({
                where: {
                    id: userId
                },
                data: {
                    role: role
                }
            });
        },
        async createIcs(actor: Users, userId: string): Promise<Users> {
            if (actor.role !== userId) {
                throw new HTTP403Error('Not authorized');
            }
            return createIcsFile(userId, '');
        },
        async affectedEvents(actor: Users, userId: string, semesterId?: string): Promise<Event[]> {
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
            const events = await prisma.$queryRaw<Event[]>(
                queryAffectedEvents(user.id, { 
                    type: "absolute", 
                    from: semester.start,
                    to: semester.end
                })
            );
            return events;
        }
    })
}

export default Users(prisma.user);