import { Event, PrismaClient, Role, User } from "@prisma/client";
import {default as createIcsFile} from '../services/createIcs';
import { default as queryAffectedEvents} from "../services/assets/query.eventsAffectingUser";
import prisma from "../prisma";

function Users(prismaUser: PrismaClient['user']) {
    return Object.assign(prismaUser, {
        /**
         * Signup the first user and create a new team of one. Return the User with
         * a full name and without a password
         */
        async find(id: string): Promise<User | null> {
            return prismaUser.findUnique({ where: { id } });
        },
        async all(): Promise<User[]> {
            return prismaUser.findMany({});
        },
        async linkToUntis(actor: User, userId: string, untisId: number | null): Promise<User> {
            if (actor.role !== Role.ADMIN && actor.id !== userId) {
                throw new Error('Not authorized');
            }
            return prismaUser.update({
                where: {
                    id: userId
                },
                data: {
                    untisId: untisId || null
                }
            });
        },
        async setRole(actor: User, userId: string, role: Role): Promise<User> {
            if (actor.role !== Role.ADMIN) {
                throw new Error('Not authorized');
            }
            return prismaUser.update({
                where: {
                    id: userId
                },
                data: {
                    role: role
                }
            });
        },
        async createIcs(actor: User, userId: string): Promise<User> {
            if (actor.role !== userId) {
                throw new Error('Not authorized');
            }
            return createIcsFile(userId, '');
        },
        async affectedEvents(actor: User, userId: string, semesterId?: string): Promise<Event[]> {
            if (actor.role !== userId && actor.role !== Role.ADMIN) {
                throw new Error('Not authorized');
            }
            const user = await this.find(userId);
            if (!user) {
                throw new Error('User not found');
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
                throw new Error('Semester not found');
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