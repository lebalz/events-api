import { PrismaClient, User } from 'prisma/generated/client.js';
import prisma from 'src/prisma.js';
import { prepareClass } from './untis.helpers.js';

function UntisClasses(db: PrismaClient['untisClass']) {
    return Object.assign(db, {
        async all(actor?: User) {
            if (actor) {
                const models = await prisma.untisClass.findMany({
                    include: {
                        teachers: {
                            select: {
                                id: true
                            }
                        },
                        lessons: {
                            select: {
                                id: true
                            }
                        }
                    }
                });
                return models.map(prepareClass);
            }
            const models = await prisma.untisClass.findMany();
            return models.map(prepareClass);
        }
    });
}

export default UntisClasses(prisma.untisClass);
