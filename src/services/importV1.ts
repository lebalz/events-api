import { Department, Event, EventAudience, TeachingAffected } from '@prisma/client';
import readXlsxFile, { Row } from 'read-excel-file/node';
import prisma from '../prisma';
import { i18nKey, translate } from './helpers/i18n';
import { Departments, fromDisplayClassName } from './helpers/departmentNames';
import { Cell } from 'read-excel-file/types';
import { KlassName, mapLegacyClassName } from './helpers/klassNames';

const CLASS_NAME_MATCHER = /(\d\d)([a-z][A-Z]|[A-Z][a-z])/g;
const LEGACY_CLASS_NAME_MATCHER = /(2[456][a-zA-Z])(?=[^a-zA-Z\*]|$)/g;

export type Meta = {
    type: 'import';
    version: 'v1';
    rowNr: number;
    warnings: string[];
    warningsReviewed: boolean;
    raw: {
        description: string;
        location: string;
        descriptionLong: string;
        classes: string;
        excludedClasses: string;
        affects: string;
        teachingAffected: string;
        bilingueLPsAffected: string;
        startDate: string;
        startTime: string;
        endDate: string;
        endTime: string;
        departments: string[];
    };
};

/**
 *
 * @param raw string to be mapped to class names
 * @example '25A, 25B, 27m*' -> ['25mA', '25mB']
 */
export const mapClassNames = (raw: string) => {
    return new Set([
        ...(raw.match(CLASS_NAME_MATCHER)?.map((c) => c) || []),
        ...(raw.match(LEGACY_CLASS_NAME_MATCHER)?.map((c) => mapLegacyClassName(c)) || [])
    ]);
};

export const LogMessage = (event: Event) => {
    if (!event.meta) {
        return '';
    }
    const meta = event.meta as unknown as Meta;
    return `Row ${meta.rowNr} [${event.description}]: ${meta.warnings.join(', ')}`;
};

const extractTime = (time?: string): [number, number] => {
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

const ALIASES = {
    ['GBSL']: Departments.GYMD,
    ['GBSL/GBJB']: Departments.GYMDBilingual,
    ['GBJB']: Departments.GYMF,
    ['GBJB/GBSL']: Departments.GYMFBilingual
};

const mapAlias = (name: string): string => {
    if (name in ALIASES) {
        return ALIASES[name as keyof typeof ALIASES];
    }
    return name;
};

const getColumnIndex = (header: Row, key: string) => {
    const sanitizer = (s: Cell) =>
        mapAlias(`${s}`)
            .replaceAll(/[^a-zA-Z0-9]/g, '')
            .toLowerCase();
    const headerNames = header.map(sanitizer);
    return Math.max(
        headerNames.indexOf(sanitizer(translate(key as i18nKey, 'de'))),
        headerNames.indexOf(sanitizer(translate(key as i18nKey, 'fr')))
    );
};

const getColumnIndices = (header: Row, departments: Department[]) => {
    return {
        kw: getColumnIndex(header, 'kw'),
        weekday: getColumnIndex(header, 'weekday'),
        description: getColumnIndex(header, 'description'),
        dateStart: getColumnIndex(header, 'dateStart'),
        timeStart: getColumnIndex(header, 'timeStart'),
        dateEnd: getColumnIndex(header, 'dateEnd'),
        timeEnd: getColumnIndex(header, 'timeEnd'),
        location: getColumnIndex(header, 'location'),
        descriptionLong: getColumnIndex(header, 'descriptionLong'),
        ...departments.reduce((prev, dep) => {
            const idx = getColumnIndex(header, dep.name);
            if (idx > -1) {
                return { ...prev, [dep.name]: idx };
            }
            return prev;
        }, {}),
        bilingueLPsAffected: getColumnIndex(header, 'bilingueLPsAffected'),
        classes: getColumnIndex(header, 'classes'),
        excludedClasses: getColumnIndex(header, 'excludedClasses'),
        affects: getColumnIndex(header, 'affects'),
        teachingAffected: getColumnIndex(header, 'teachingAffected'),
        deletedAt: getColumnIndex(header, 'deletedAt')
    };
};

const asTeachingAffected = (value: any) => {
    if (Object.values(TeachingAffected).includes(value as TeachingAffected)) {
        return value as TeachingAffected;
    }
    return TeachingAffected.YES;
};

const asAudience = (value: any) => {
    if (Object.values(EventAudience).includes(value as EventAudience)) {
        return value as EventAudience;
    }
    return EventAudience.STUDENTS;
};

export const importExcel = async (file: string) => {
    const departments = await prisma.department.findMany({});
    const xlsx = await readXlsxFile(file, { dateFormat: 'YYYY-MM-DD' });
    const header = xlsx[0];
    const COLUMNS = getColumnIndices(header, departments);

    return Promise.all(
        xlsx
            .slice(1)
            .filter((e) => !e[COLUMNS.deletedAt])
            .map(async (e, idx) => {
                const warnings: string[] = [];
                const start = toDate(e[COLUMNS.dateStart] as string)!;
                const startTime = e[COLUMNS.timeStart] as string;
                const [startHours, startMinutes] = extractTime(startTime);
                if (startTime) {
                    start.setUTCHours(startHours, startMinutes, 0, 0);
                }
                let ende = toDate(e[COLUMNS.dateEnd] as string);
                if (!ende) {
                    ende = new Date(start);
                }
                const endTime = e[COLUMNS.timeEnd] as string;
                if (!!endTime) {
                    /**
                     * if end-time is set, use it
                     */
                    const [hours, minutes] = extractTime(endTime);
                    ende.setUTCHours(hours, minutes, 0, 0);
                } else if (startHours === 0 && startMinutes === 0) {
                    /**
                     * if start-time is midnight, set end-time to midnight
                     * of the following day
                     */
                    ende.setUTCHours(24, 0, 0, 0);
                } else {
                    /**
                     * otherwise: use start-time as end-time
                     * if start-time is set
                     */
                    ende.setUTCHours(startHours, startMinutes, 0, 0);
                }
                if (ende.getTime() < start.getTime()) {
                    warnings.push(
                        `Invalid end: ${start.toISOString().slice(0, 16)} - ${ende.toISOString().slice(0, 16)}. Autofix applied: end date set to 15 minutes after the start.`
                    );
                    ende = new Date(start.getTime() + 15 * 60 * 1000);
                }
                const classesRaw = (e[COLUMNS.classes] as string) || '';
                const classes = new Set(
                    [...mapClassNames(classesRaw)].map((c) =>
                        fromDisplayClassName(c as KlassName, departments)
                    )
                );
                const classGroups = new Set(
                    classesRaw.match(/(\d\d)(\*|[a-z]\*|[A-Z]\*)/g)?.map((c) => c.replace(/\*/g, '')) || []
                );
                for (const cg of classGroups) {
                    for (const c of classes) {
                        if (c.startsWith(cg)) {
                            classes.delete(c);
                        }
                    }
                }
                const excludedClassesRaw = (e[COLUMNS.excludedClasses] as string) || '';
                const excludedClasses = [...mapClassNames(excludedClassesRaw)].map((c) =>
                    fromDisplayClassName(c as KlassName, departments)
                );
                if (excludedClasses.length > 0 && (classGroups.size > 0 || classes.size > 0)) {
                    for (const excludedClass of excludedClasses) {
                        for (const cg of classGroups) {
                            if (excludedClass.startsWith(cg)) {
                                const allFromGroup = await prisma.untisClass.findMany({
                                    where: {
                                        name: { startsWith: cg }
                                    },
                                    select: { name: true }
                                });
                                allFromGroup.forEach((c) => classes.add(c.name as KlassName));
                                classGroups.delete(cg);
                            }
                            classes.delete(excludedClass);
                        }
                        classes.delete(excludedClass);
                    }
                }
                const assignedDeps = departments
                    .filter((dep) => e[(COLUMNS as { [key: string]: number })[dep.name]] === 1)
                    .map((dep) => ({ id: dep.id }));
                return {
                    start: start,
                    end: ende,
                    description: (e[COLUMNS.description] as string) || '',
                    location: (e[COLUMNS.location] as string) || '',
                    descriptionLong: (e[COLUMNS.descriptionLong] as string) || '',
                    affectsDepartment2: e[COLUMNS.bilingueLPsAffected] === 1,
                    classes: [...classes],
                    classGroups: [...classGroups],
                    audience: asAudience(e[COLUMNS.affects]),
                    teachingAffected: asTeachingAffected(e[COLUMNS.teachingAffected]),
                    departments: assignedDeps,
                    meta: {
                        type: 'import',
                        version: 'v1',
                        rowNr: idx + 1,
                        warnings: warnings,
                        warningsReviewed: false,
                        raw: {
                            description: (e[COLUMNS.description] as string) || '',
                            location: (e[COLUMNS.location] as string) || '',
                            descriptionLong: (e[COLUMNS.descriptionLong] as string) || '',
                            classes: (e[COLUMNS.classes] as string) || '',
                            excludedClasses: (e[COLUMNS.excludedClasses] as string) || '',
                            affects: (e[COLUMNS.affects] as string) || '',
                            teachingAffected: (e[COLUMNS.teachingAffected] as string) || '',
                            bilingueLPsAffected: (e[COLUMNS.bilingueLPsAffected] as string) || '',
                            startDate: (e[COLUMNS.dateStart] as string) || '',
                            startTime: (e[COLUMNS.timeStart] as string) || '',
                            endDate: (e[COLUMNS.dateEnd] as string) || '',
                            endTime: (e[COLUMNS.timeEnd] as string) || '',
                            departments: departments
                                .filter((dep) => e[(COLUMNS as { [key: string]: number })[dep.name]] === 1)
                                .map((dep) => dep.name)
                        }
                    } satisfies Meta
                };
            })
    );
};
