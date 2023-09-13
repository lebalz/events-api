import { Prisma } from '@prisma/client';
import prisma from '../../../src/prisma';

export const truncate = async () => {
    const DATABASE_URL = process.env.DATABASE_URL;
    if (!DATABASE_URL) {
        throw new Error('DATABASE_URL not set');
    }    
    await prisma.$transaction([
        prisma.department.deleteMany(),
        prisma.job.deleteMany(),
        prisma.registrationPeriod.deleteMany(),
        prisma.semester.deleteMany(),
        prisma.untisClass.deleteMany(),
        prisma.untisLesson.deleteMany(),
        prisma.untisTeacher.deleteMany(),
        prisma.event.deleteMany(),
        prisma.user.deleteMany(),
        prisma.userEventGroup.deleteMany(),
    ])
};
