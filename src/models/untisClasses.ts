import { PrismaClient, User } from "@prisma/client";
import prisma from "../prisma";

function UntisClasses(db: PrismaClient['untisClass']) {
    return Object.assign(db, {
        async all(actor?: User) {
            if (actor) {
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
            const models = await prisma.untisClass.findMany();
            return models.map((m) => ({...m, teachers: [], lessons: []}));
        }
    })
}

export default UntisClasses(prisma.untisClass);