import { fetchUntis } from '../src/services/fetchUntis';
import { syncUntis2DB } from '../src/services/syncUntis2DB';
import prisma from '../src/prisma';

const main = async () => {
    if (process.argv.length < 3) {
        throw new Error('No date given, run with "yarn untis:sync 2021-09-01"');
    }
    const date = new Date(process.argv[2]);
    console.log('SYNCING', date);
    const semester = await prisma.semester.findFirst({
        where: {
            start: { lte: date },
            end: { gte: date }
        }
    });
    if (!semester) {
        throw new Error('No current semester found');
    }
    await syncUntis2DB(semester.id, fetchUntis);
};

main().catch((err) => console.error(err));
