import fs from 'fs';
import { finished } from 'stream/promises';
import { parse } from 'csv-parse';
import { ImportRawEvent } from "./importEvents";

interface Record {
    ID: string;
    COORDINATION: string;
    WORK: string;
    PLANNING: string;
    WSTEACHERID: string;
    GYM_CODE: 'GF' | 'GBSL';
    DESCRIPTION: string;
    DETAILS: string;
    STARTDATE: string;
    ENDDATE: string;
    LOCATION: string;
    PROVISORY: string;
    TITLE: string;
    APILANGUAGE_CODE: 'FR' | 'DE';
}

/**
 * 
 * @param dateString of the form '2023-08-29 08:25:00'
 */
const toDate = (dateString: string): Date => {
    return new Date(`${dateString.split(' ').join('T')}.000Z`);
}

const KLASS_REGEX = /2\d[a-zA-Z][a-zA-Z]*/;

export const importCsv = async (file: string) => {
    const rawEvents: ImportRawEvent[] = [];
    const parser = fs
        .createReadStream(file)
        .pipe(parse({
            delimiter: ',',
            columns: true,
        }));
    parser.on('readable', async function () {
        let record: Record;
        while ((record = parser.read()) !== null) {
            if (record.COORDINATION === '1' && record.WORK === '0' && record.PLANNING === '0') {
                continue;
            }
            let description2klasses = `${record.DETAILS} ${record.DESCRIPTION}`
            const klasses: string[] = []
            let match: RegExpMatchArray | null;
            while (match = description2klasses.match(KLASS_REGEX)) {
                klasses.push(match[0])
                description2klasses = description2klasses.slice(match.index! + match[0].length)
            }


            rawEvents.push({
                description: record.TITLE,
                descriptionLong: [record.DESCRIPTION, record.DETAILS].map(e => e.trim()).filter((e) => !!e).join('\n'),
                location: record.LOCATION,
                classesRaw: klasses.join(' '),
                start: toDate(record.STARTDATE),
                end: toDate(record.ENDDATE),
            });
        }
    });
    await finished(parser);
    return rawEvents;
}
