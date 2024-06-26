import { Event, EventAudience, TeachingAffected } from '@prisma/client';
import readXlsxFile from 'read-excel-file/node';
import { ImportRawEvent } from './importEvents';
import { rmUndefined } from '../utils/filterHelpers';
import { Cell } from 'read-excel-file/types';

const COLUMNS = {
    KW: 0,
    weekday: 1,
    description: 2,
    startDate: 3,
    startTime: 4,
    endDate: 5,
    endTime: 6,
    location: 7,
    affectedTeachers: 8,
    gbsl: 9,
    fms: 10,
    wms: 11,
    descriptionLong: 12,
    classYears: 13,
    classes: 14,
    audience: 15, // not existing in sl import
    teachingAffected: 16, // not existing in sl import
    deletedAt: 17 // not existing in sl import
} as const;

export type Meta = {
    type: 'import';
    version: 'gbsl_xlsx';
    rowNr: number;
    infos: string[];
    infosReviewed: boolean;
    warnings: string[];
    warningsReviewed: boolean;
    raw: {
        KW: number;
        weekday: string;
        startDate: string;
        startTime: string;
        endDate: string;
        endTime: string;
        location: string;
        categories: {
            gbsl: boolean;
            fms: boolean;
            wms: boolean;
        };
        affectedTeachers: string;
        classYears: string;
        classes: string;
        audience: number | undefined;
        teachingAffected: number | undefined;
    };
};

export const LogMessage = (event: Event, logType: 'warning' | 'info'): string => {
    if (!event.meta) {
        return '';
    }
    const meta = event.meta as unknown as Meta;
    switch (logType) {
        case 'info':
            return `Row ${meta.rowNr} [${event.description}]: ${meta.infos.join(', ')}`;
        case 'warning':
            return `Row ${meta.rowNr} [${event.description}]: ${meta.warnings.join(', ')}`;
    }
};

const extractTime = (time: string): [number, number] => {
    if (!time) {
        return [0, 0];
    }
    const raw = `${time}`.match(/(\d\d):(\d\d)/);
    if (!raw) {
        return [0, 0];
    }
    const hours = Number.parseInt(raw[1], 10);
    const minutes = Number.parseInt(raw[2], 10);
    return [hours, minutes];
};

const toDate = (date: Date | string): Date | undefined => {
    if (!date) {
        return undefined;
    }
    if (typeof date === 'string') {
        const [dd, mm, yyyy] = date.split('.');
        return new Date(Date.parse(`${yyyy}-${mm}-${dd}T00:00:00.000Z`));
    }
    const newDate = new Date(date);
    newDate.setUTCHours(0, 0, 0, 0);
    return newDate;
};
/*                          negative lookbehind --> only match LP but not KLP */
const LP =
    /(Lehrer\:innen|(?<!K)L[Pp]|Klassenteam|Fachlehrer\*innen|Fachschaftsvorstände|Delegierte\:r|Betreuer\:innen|Expert\:innen|[Ll]ehrperson(en)?|Eine Person pro Abteilung|Mentor\:innen|Betreuer\*innen|[Ff]achschaft|LK|(([a-z]{3}(, |$)+){2,}))/;
const KLP = /(KLP?|[Kk]lassenlehrperson(en)?|[Kk]lassenlehrer\*innen)/;

const extractAudience = (audience: string): EventAudience => {
    if (!audience) {
        return EventAudience.STUDENTS;
    }
    if (LP.test(audience)) {
        return EventAudience.LP;
    }
    if (KLP.test(audience)) {
        return EventAudience.KLP;
    }
    return EventAudience.STUDENTS;
};

const extractAudienceFromNumber = (audience?: number) => {
    switch (audience) {
        case 0:
            return EventAudience.KLP;
        case 1:
            return EventAudience.LP;
        case 2:
            return EventAudience.STUDENTS;
        case 3:
            return EventAudience.ALL;
    }
};
const extractTeachingAffectedFromNumber = (audience?: number) => {
    switch (audience) {
        case 0:
            return TeachingAffected.NO;
        case 1:
            return TeachingAffected.PARTIAL;
        case 2:
            return TeachingAffected.YES;
    }
};

const extractNumericCell = (cell: Cell): number | undefined => {
    try {
        return Number.parseInt(`${cell}`, 10);
    } catch (e) {
        return undefined;
    }
};

export const importExcel = async (
    file: string
): Promise<
    (ImportRawEvent & {
        classYears: string;
        departments: { gym: boolean; fms: boolean; wms: boolean };
        meta: Meta;
    })[]
> => {
    const xlsx = await readXlsxFile(file, { dateFormat: 'YYYY-MM-DD' });
    return xlsx
        .slice(1)
        .filter((e) => !e[COLUMNS.deletedAt])
        .map((e, idx) => {
            const start = toDate(e[COLUMNS.startDate] as string)!;
            const startTime = e[COLUMNS.startTime] as string;
            const warnings: string[] = [];
            if (startTime) {
                const [hours, minutes] = extractTime(startTime);
                start.setUTCHours(hours, minutes, 0, 0);
            }
            let ende = toDate(e[COLUMNS.endDate] as string);
            if (!ende) {
                ende = new Date(start);
            }
            const endTime = e[COLUMNS.endTime] as string;
            if (!!endTime) {
                const [hours, minutes] = extractTime(endTime);
                ende.setUTCHours(hours, minutes, 0, 0);
            } else {
                ende.setUTCHours(24, 0, 0, 0);
            }
            if (ende.getTime() < start.getTime()) {
                warnings.push(
                    `Invalid end: ${start.toISOString().slice(0, 16)} - ${ende.toISOString().slice(0, 16)}. Autofix applied: end date set to 15 minutes after the start.`
                );
                ende = new Date(start.getTime() + 15 * 60 * 1000);
            }
            const audienceValue = extractNumericCell(e[COLUMNS.audience]);
            const audience = extractAudienceFromNumber(audienceValue) || EventAudience.ALL;
            const teachingAffectedValue = extractNumericCell(e[COLUMNS.teachingAffected]);
            const teachingAffected =
                extractTeachingAffectedFromNumber(teachingAffectedValue) || TeachingAffected.YES;
            return {
                description: (e[COLUMNS.description] as string) || '',
                descriptionLong: (e[COLUMNS.descriptionLong] as string) || '',
                location: (e[COLUMNS.location] as string) || '',
                start: start,
                end: ende,
                departments: {
                    gym: !!e[COLUMNS.gbsl] as boolean,
                    fms: !!e[COLUMNS.fms] as boolean,
                    wms: !!e[COLUMNS.wms] as boolean
                },
                classYears: (e[COLUMNS.classYears] as string) || '',
                classesRaw: (e[COLUMNS.classes] as string) || '',
                audience: audience,
                teachingAffected: teachingAffected,
                meta: {
                    type: 'import',
                    version: 'gbsl_xlsx',
                    rowNr: idx + 2,
                    infos: [],
                    infosReviewed: false,
                    warnings: warnings,
                    warningsReviewed: false,
                    raw: {
                        KW: (e[COLUMNS.KW] as number) || 0,
                        weekday: (e[COLUMNS.weekday] as string) || '',
                        startDate: (e[COLUMNS.startDate] as string) || '',
                        startTime: (e[COLUMNS.startTime] as string) || '',
                        endDate: (e[COLUMNS.endDate] as string) || '',
                        endTime: (e[COLUMNS.endTime] as string) || '',
                        location: (e[COLUMNS.location] as string) || '',
                        categories: {
                            gbsl: !!e[COLUMNS.gbsl] as boolean,
                            fms: !!e[COLUMNS.fms] as boolean,
                            wms: !!e[COLUMNS.wms] as boolean
                        },
                        affectedTeachers: (e[COLUMNS.affectedTeachers] as string) || '',
                        classYears: (e[COLUMNS.classYears] as string) || '',
                        classes: (e[COLUMNS.classes] as string) || '',
                        audience: audienceValue,
                        teachingAffected: teachingAffectedValue
                    }
                } satisfies Meta
            };
        });
};
