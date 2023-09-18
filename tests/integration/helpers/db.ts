import prisma from '../../../src/prisma';
import { unlinkSync } from 'fs';

export const truncate = async () => {
    const DATABASE_URL = process.env.DATABASE_URL;
    if (!DATABASE_URL) {
        throw new Error('DATABASE_URL not set');
    }
    const icals = await prisma.user.findMany({where: {icsLocator: {not: null}}});
    icals.forEach(ical => {
        const path = `${__dirname}/../../../ical/${ical.icsLocator}`;
        try {
            unlinkSync(path);
        } catch (error) {
            console.warn(error);
        }
    });
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
