
import { Department, JobType, Prisma, Semester, UntisLesson } from "@prisma/client";
import prisma from '../src/prisma';
import { syncUntis2DB } from '../src/services/syncUntis2DB';
import { importExcel } from '../src/services/importExcel';
import fs from 'fs';

async function main() {
    /** CHECK THAT NO SEMESTER EXISTS, OTHERWISE FAIL */
    const drs = await prisma.semester.deleteMany({});
    const urs = await prisma.user.deleteMany({});
    const semesters = await prisma.semester.findMany({});
    if (semesters.length > 0) {
        console.error('Semester already exist. Aborting.');
        return;
    }
    /** CREATE SEMESTER */
    const year = new Date().getFullYear();
    const sem = new Date().getMonth() > 7 ? 'HS' : 'FS';
    const semester = await prisma.semester.create({
        data: {
            name: `${sem}${year}`,
            start: new Date(`${year}-${sem === 'HS' ? '08-15' : '02-06'}`),
            end: new Date(`${sem === 'HS' ? year + 1 : year}-${sem === 'HS' ? '02-14' : '08-14'}`),
            untisSyncDate: new Date(`${year}-${sem === 'HS' ? '11-15' : '03-15'}`)
        }
    });
    console.log(`Created Semester`, semester);

    /** CREATE USER */
    const user = await prisma.user.create({
        data: {
            email: process.env.ADMIN_EMAIL!.toLowerCase(),
            firstName: process.env.ADMIN_EMAIL!.split('@')[0].split('.')[0],
            lastName: process.env.ADMIN_EMAIL!.split('@')[0].split('.')[1],
            id: process.env.ADMIN_ID!,
            role: 'ADMIN'
        }
    });
    /** SYNC UNTIS */
    const res = await syncUntis2DB(semester.id)

    /** IMPORT terminpläne in bin/excel */
    const seedFiles = fs.readdirSync('./bin/excel');
    const promises = seedFiles.filter(file => file.endsWith('.xlsx')).map(async xlsx => {
        const fname = `./bin/excel/${xlsx}`;
        const importJob1 = await prisma.job.create({
            data: {
                type: JobType.IMPORT,
                user: { connect: { id: user.id } },
                filename: xlsx,
            }
        });
        return importExcel(fname, user.id, importJob1.id);
    });
    await Promise.all(promises);
}

main()
    .catch((e) => console.error(e))
    .finally(async () => await prisma.$disconnect());

//!  put a dollar-sign between "." and "disconnect"
