import prisma from '../../src/prisma';
import { mkdirSync, rmSync, writeFileSync } from 'fs';

export const truncate = async (deleteFiles: boolean = true) => {
    const DATABASE_URL = process.env.DATABASE_URL;
    if (!DATABASE_URL) {
        throw new Error('DATABASE_URL not set');
    }
    if (deleteFiles) {
        ['uploads', 'ical/de', 'ical/fr', 'exports'].forEach(dir => {
            const path = `${__dirname}/../test-data/${dir}`;
            try {
                rmSync(path, { recursive: true });
                mkdirSync(path, { recursive: true });
                writeFileSync(`${path}/.gitkeep`, '');
            } catch (error) {
                console.warn(error);
            }
        });
    }

    await prisma.$transaction([
        prisma.registrationPeriod.deleteMany(),
        prisma.department.deleteMany(),
        prisma.job.deleteMany(),
        prisma.semester.deleteMany(),
        prisma.untisClass.deleteMany(),
        prisma.untisLesson.deleteMany(),
        prisma.untisTeacher.deleteMany(),
        prisma.event.deleteMany(),
        prisma.eventGroup.deleteMany(),
        prisma.user.deleteMany(),
    ])
};
