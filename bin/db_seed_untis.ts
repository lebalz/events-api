
// import { JobState, JobType } from "@prisma/client";
import prisma from '../src/prisma';
import { syncUntis2DB } from '../src/services/syncUntis2DB';
import { importExcel } from '../src/services/importExcel';
import fs from 'fs';

async function main() {
    /** USE THE FIRST SEMESTER */
    const semester = await prisma.semester.findFirst({});
    if (!semester) {
        console.error('No semester found. Aborting.');
        return;
    }
    /** SYNC UNTIS */
    const res = await syncUntis2DB(semester.id)

    const user = await prisma.user.findFirst({});
    if (!user) {
        console.error('No user found. Aborting.');
        return;
    }
}

main()
    .catch((e) => console.error(e))
    .finally(async () => await prisma.$disconnect());

//!  put a dollar-sign between "." and "disconnect"
