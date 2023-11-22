import { fetchUntis } from '../src/services/fetchUntis'
import prisma from '../src/prisma';

const main = async () => {
    const semester = await prisma.semester.findFirst({
        where: {
            start: {lte: new Date()},
            end: {gte: new Date()}
        }
    });
    if (!semester) {
        throw new Error('No current semester found');
    }
    await fetchUntis(semester);
}

main().catch((err) => console.error(err))