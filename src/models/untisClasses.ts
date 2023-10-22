import { PrismaClient } from "@prisma/client";
import prisma from "../prisma";

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