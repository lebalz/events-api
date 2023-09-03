import { Event, PrismaClient, Role, User } from "@prisma/client";
import {default as createIcsFile} from '../services/createIcs';
import { default as queryAffectedEvents} from "../services/assets/query.eventsAffectingUser";
import prisma from "../prisma";
import { HTTP403Error, HTTP404Error } from "../utils/errors/Errors";

function UntisClasses(db: PrismaClient['untisClass']) {
    return Object.assign(db, {
        async all() {
            const models = await prisma.untisClass.findMany({
                include: {
                    teachers: {
                        select: {
                            id: true,
                        }
                    },
                    lessons: {
                        select: {
                            id: true,
                        }
                    }
                }
            });
            return models;
        }
        
    })
}

export default UntisClasses(prisma.untisClass);