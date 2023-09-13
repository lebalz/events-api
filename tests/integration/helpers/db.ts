import { Prisma } from '@prisma/client';
import prisma from '../../../src/prisma';

export const truncate = async () => {
    const DATABASE_URL = process.env.DATABASE_URL;
    if (!DATABASE_URL) {
        throw new Error('DATABASE_URL not set');
    }
    const DB_OWNER = DATABASE_URL.split('/')[2].split('@')[0].split(':')[0];
    const res = await prisma.$queryRaw<{query: string}[]>(
        Prisma.sql`
            SELECT 'drop table if exists "' || tablename || '" cascade;' as query
            FROM pg_tables
            WHERE tableowner = ${DB_OWNER};
        `
    );
    const promises = res.map(async (e) => {
        return prisma.$queryRawUnsafe(e.query);
    });
    return await Promise.all(promises);
};
