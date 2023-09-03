import { Event, PrismaClient, Role, User } from "@prisma/client";
import { default as createIcsFile } from '../services/createIcs';
import { default as queryAffectedEvents } from "../services/assets/query.eventsAffectingUser";
import prisma from "../prisma";
import { HTTP403Error, HTTP404Error } from "../utils/errors/Errors";

function UntisTeachers(db: PrismaClient['untisTeacher']) {
    return Object.assign(db, {
        async all() {
            const models = await db.findMany({
                include: {
                    classes: false,
                    lessons: false,
                    user: false
                }
            });
            return models;
        },
        async findModel(id: string) {
            const model = await db.findUnique({
                where: {
                    id: Number.parseInt(id, 10)
                },
                include: {
                    lessons: {
                        include: {
                            teachers: {
                                select: {
                                    id: true,
                                }
                            },
                            classes: {
                                select: {
                                    id: true,
                                }
                            }
                        }
                    },
                }
            })
        },
    })
}

export default UntisTeachers(prisma.untisTeacher);