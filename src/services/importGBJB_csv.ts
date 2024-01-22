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

const unescape = (str: string): string => {
    return str.replace(/\\'/g, "'").replace(/(\\r)?\\n/g, '\n').trim();
}

const KLASS_REGEX = /2\d[a-zA-Z][a-zA-Z]*/;

export const importCsv = async (file: string) => {
    const rawEvents: ImportRawEvent[] = [];
    const parser = fs
        .createReadStream(file)
        .pipe(parse({
            delimiter: ',',
            columns: true,
            trim: true,
            skip_empty_lines: true
        }));
    parser.on('readable', async function () {
        let record: Record;
        while ((record = parser.read()) !== null) {
            if (record.COORDINATION === '1' && record.WORK === '0' && record.PLANNING === '0') {
                continue;
            }
            if (record.GYM_CODE !== 'GF') {
                continue;
            }
            let description2klasses = `${record.DETAILS} ${record.DESCRIPTION}`
            const klasses: string[] = []
            let match: RegExpMatchArray | null;
            while (match = description2klasses.match(KLASS_REGEX)) {
                klasses.push(match[0])
                description2klasses = description2klasses.slice(match.index! + match[0].length)
            }
            const start = toDate(record.STARTDATE);
            const ende = toDate(record.ENDDATE);
            if (ende.getUTCHours() === 0 && ende.getUTCMinutes() === 0) {
                ende.setUTCHours(24, 0, 0, 0);
            }
            rawEvents.push({
                description: unescape(record.TITLE),
                descriptionLong: [record.DESCRIPTION, record.DETAILS].map(e => unescape(e)).filter((e) => !!e).join('\n'),
                location: unescape(record.LOCATION),
                classesRaw: klasses.join(' '),
                start: start,
                end: ende,
            });
        }
    });
    await finished(parser);
    return rawEvents;
}
