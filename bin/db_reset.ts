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
    /** ensure drops happen sequential to prevent deadlocks (because of the cascade) */
    for (let i = 0; i < res.length; i++) {
        const table = res[i].query.split(' ')[4];
        const r = await prisma.$queryRawUnsafe(res[i].query);
        console.log(`Dropped table ${table}`);
    }
}

main()
    .catch((e) => console.error(e))
    .finally(async () => await prisma.$disconnect());
