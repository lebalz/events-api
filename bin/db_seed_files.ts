
// import { JobState, JobType } from "@prisma/client";
import prisma from '../src/prisma';
import { syncUntis2DB } from '../src/services/syncUntis2DB';
import { importExcel } from '../src/services/importExcel';
import fs from 'fs';

async function main() {
    /** USE THE FIRST USER */
    const user = await prisma.user.findFirst({});
    if (!user) {
        console.error('No user found. Aborting.');
        return;
    }

    /** IMPORT terminpläne in bin/excel */
    const seedFiles = fs.readdirSync('./bin/excel');
    const promises = seedFiles.filter(file => file.endsWith('.xlsx')).map(async xlsx => {
        const fname = `./bin/excel/${xlsx}`;
        const importJob = await prisma.job.create({
            data: {
                type: 'IMPORT',
                user: { connect: { id: user.id } },
                filename: xlsx,
                state: 'DONE'
            }
        });
        return importExcel(fname, user.id, importJob.id);
    });
    await Promise.all(promises);
}

main()
    .catch((e) => console.error(e))
    .finally(async () => await prisma.$disconnect());

//!  put a dollar-sign between "." and "disconnect"
