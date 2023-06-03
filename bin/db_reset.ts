import { Prisma } from '@prisma/client';
import prisma from '../src/prisma';


async function main() {
    const res = await prisma.$queryRaw<{query: string}[]>(
        Prisma.sql`
            SELECT 'drop table if exists "' || tablename || '" cascade;' as query
            FROM pg_tables
            WHERE tableowner = 'events_api';
        `
    );
    const promises = res.map(async (e) => {
        return prisma.$queryRawUnsafe(e.query);
    });
    await Promise.all(promises);
    console.log(res);
}

main()
    .catch((e) => console.error(e))
    .finally(async () => await prisma.$disconnect());
