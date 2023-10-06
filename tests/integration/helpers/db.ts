import prisma from '../../../src/prisma';
import { mkdirSync, rmSync, unlinkSync, writeFileSync } from 'fs';

export const truncate = async () => {
    const DATABASE_URL = process.env.DATABASE_URL;
    if (!DATABASE_URL) {
        throw new Error('DATABASE_URL not set');
    }
    ['uploads', 'ical', 'exports'].forEach(dir => {
        const path = `${__dirname}/../../test-data/${dir}`;
        try {
            rmSync(path, { recursive: true });
            mkdirSync(path);
            writeFileSync(`${path}/.gitkeep`, '');
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
        prisma.userEventGroup.deleteMany(),
        prisma.user.deleteMany(),
    ])
};
