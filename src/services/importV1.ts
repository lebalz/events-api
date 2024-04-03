import { Department, EventAudience, TeachingAffected } from "@prisma/client";
import readXlsxFile, { Row } from 'read-excel-file/node';
import { ImportRawEvent } from "./importEvents";
import prisma from "../prisma"
import { i18nKey, translate } from "./helpers/i18n";
import { Cell } from "read-excel-file/types";

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
}

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
}

const getColumnIndex = (header: Row, key: string) => {
    const headerNames = header.map((h) => h.toString().toLowerCase());
    return Math.max(
        headerNames.indexOf(translate(key as i18nKey, 'de').toLowerCase()),
        headerNames.indexOf(translate(key as i18nKey, 'fr').toLowerCase())
    );
}

const getColumnIndices = async (header: Row, departments: Department[]) => {
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
                return {...prev, [dep.name]: idx}
            }
            return prev
        }, {}),
        bilingueLPsAffected: getColumnIndex(header, 'bilingueLPsAffected'),
        classes: getColumnIndex(header, 'classes'),
        affects: getColumnIndex(header, 'affects'),
        teachingAffected: getColumnIndex(header, 'teachingAffected'),
        deletedAt: getColumnIndex(header, 'deletedAt')
    };
}

const asTeachingAffected = (value: any) => {
    if (Object.values(TeachingAffected).includes(value as TeachingAffected)) {
        return value as TeachingAffected;
    }
    return TeachingAffected.YES;
}

const asAudience = (value: any) => {
    if (Object.values(EventAudience).includes(value as EventAudience)) {
        return value as EventAudience;
    }
    return EventAudience.STUDENTS;
}

export const importExcel = async (file: string) => {
    const departments = await prisma.department.findMany({});
    const xlsx = await readXlsxFile(file, { dateFormat: 'YYYY-MM-DD' });
    const header = xlsx[0];
    const COLUMNS = await getColumnIndices(header, departments);

    return xlsx.slice(1).filter((e => !e[COLUMNS.deletedAt])).map((e) => {
        const start = toDate(e[COLUMNS.dateStart] as string)!;
        const startTime = e[COLUMNS.timeStart] as string;
        if (startTime) {
            const [hours, minutes] = extractTime(startTime);
            start.setUTCHours(hours, minutes, 0, 0);
        }
        let ende = toDate(e[COLUMNS.dateEnd] as string);
        if (!ende) {
            ende = new Date(start);
        }
        const endTime = e[COLUMNS.timeEnd] as string;
        if (!!endTime) {
            const [hours, minutes] = extractTime(endTime);
            ende.setUTCHours(hours, minutes, 0, 0);
        } else {
            ende.setUTCHours(24, 0, 0, 0);
        }
        const classesRaw = e[COLUMNS.classes] as string || '';
        const classes = classesRaw.match(/(\d\d)([a-z][A-Z]|[A-Z][a-z])/g)?.map((c) => c) || [];
        const classGroups = classesRaw.match(/(\d\d)(\*|[a-z]\*|[A-Z]\*)/g)?.map((c) => c.replace(/\*/g, '')) || [];
        const assignedDeps = departments.filter(dep => e[(COLUMNS as {[key: string]: number})[dep.name]] === 1).map(dep => ({id: dep.id}));
        return {
            start: start,
            end: ende,
            description: e[COLUMNS.description] as string || '',
            location: e[COLUMNS.location] as string || '',
            descriptionLong: e[COLUMNS.descriptionLong] as string || '',
            affectsDepartment2: e[COLUMNS.bilingueLPsAffected] === 1,
            classes: classes,
            classGroups: classGroups,
            audience: asAudience(e[COLUMNS.affects]),
            teachingAffected: asTeachingAffected(e[COLUMNS.teachingAffected]),
            departments: assignedDeps
        };
    });
}
