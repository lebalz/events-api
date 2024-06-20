import { parse } from 'csv-parse';
import fs from 'fs';
import os from 'os';
import { finished } from 'stream/promises';
import prisma from '../src/prisma';
import { Prisma, UntisTeacher } from '@prisma/client';

interface Record {
    id: string;
    userPrincipalName: string;
    displayName: string;
    surname: string;
    mail: string;
    givenName: string;
    userType: 'Member';
    jobTitle: 'Lehrer' | 'Schueler';
    department: string;
    companyName: string;
}

// Read and process the CSV file
const processFile = async (filePath: string) => {
    const records: Record[] = [];
    const parser = fs.createReadStream(filePath).pipe(
        parse({
            delimiter: ',',
            columns: true
        })
    );

    parser.on('readable', async function () {
        let record: Record;
        while ((record = parser.read()) !== null) {
            if (record.jobTitle !== 'Lehrer') {
                continue;
            }
            const name = `${record.surname} ${record.givenName}`;
            if (record.surname.length < 2 || record.givenName.length < 2) {
                console.log('Skipping', name);
                continue;
            }
            if (/\d/.test(name)) {
                console.log('Skipping', name);
                continue;
            }
            const sql = Prisma.sql`
                SELECT * FROM untis_teachers
                WHERE SIMILARITY(long_name, ${name}) > 0.6
                ORDER BY SIMILARITY(long_name, ${name}) DESC
                LIMIT 1
            `;
            const untisTeacher = await prisma.$queryRaw<UntisTeacher[]>(sql);
            if (untisTeacher.length === 0) {
                console.log('No match for', name);
            }
            // Work with each record
            const user = await prisma.user.upsert({
                where: { id: record.id },
                update: {
                    email: record.mail.toLowerCase(),
                    firstName: record.givenName,
                    lastName: record.surname,
                    untisId: untisTeacher[0]?.id ?? null
                },
                create: {
                    id: record.id,
                    email: record.mail.toLowerCase(),
                    firstName: record.givenName,
                    lastName: record.surname,
                    untisId: untisTeacher[0]?.id ?? null
                }
            });
            records.push(record);
        }
    });
    await finished(parser);
    return records;
};
processFile(`${__dirname}/excel/gbsl-2023-10-17.csv`)
    .then((recs) => {
        // console.log(recs);
        return processFile(`${__dirname}/excel/gbjb-2023-10-17.csv`);
    })
    .then
    // (recs) => console.log(recs)
    ();
