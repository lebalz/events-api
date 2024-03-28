import { EventState } from "@prisma/client";
import prisma from "../prisma"
import Excel from 'exceljs';
import {existsSync, readdirSync, rmSync} from 'fs';
import Logger from "../utils/logger";
import { translate } from "./helpers/i18n";


export const SEC_2_MS = 1000;
export const MINUTE_2_MS = 60 * SEC_2_MS;
export const HOUR_2_MS = 60 * MINUTE_2_MS;
export const DAY_2_MS = 24 * HOUR_2_MS; // 1000*60*60*24=86400000
export const WEEK_2_MS = 7 * DAY_2_MS;
export const DAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'] as const;
export const DAYS_LONG = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'] as const;

const DEP_ORDER = ['GBSL', 'GBSL/GBJB', 'GBJB', 'GBJB/GBSL', 'FMS', 'ECG', 'ECG/FMS', 'WMS', 'ESC', 'FMPäd', 'MSOP', 'Passerelle']

export const EXCEL_EXPORT_DIR =
    process.env.NODE_ENV === 'test' 
        ? `${__dirname}/../../tests/test-data/exports`
        : process.env.EXPORT_DIR 
            ? process.env.EXPORT_DIR
            : `${__dirname}/../../exports`;

const getKW = (date: Date) => {
    const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0));
    const dayNumber = date.getUTCDay() || 7;
    utcDate.setUTCDate(date.getUTCDate() + 4 - dayNumber);
    const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
    return Math.ceil(((utcDate.getTime() - yearStart.getTime()) / DAY_2_MS + 1) / 7);
}

const formatTime = (date: Date, ignore00: boolean = false) => {
    const hours = `${date.getUTCHours()}`.padStart(2, '0');
    const minutes = `${date.getUTCMinutes()}`.padStart(2, '0');
    if (ignore00 && hours === '00' && minutes === '00') {
        return ''
    }
    return `${hours}:${minutes}`;
}

const formatDate = (date: Date) => {
    const day = `${date.getUTCDate()}`.padStart(2, '0');
    const month = `${date.getUTCMonth() + 1}`.padStart(2, '0');
    const year = `${date.getUTCFullYear()}`.padStart(4, '0');

    return `${day}.${month}.${year}`;
}


const createExcel = async (semesterId: string) => {
    const now = new Date();
    const semester = await prisma.semester.findUnique({ where: { id: semesterId } });
    if (!semester) {
        return false;
    }
    const timeStamp = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}_${now.getHours()}-${Math.floor(now.getMinutes() / 5) * 5}`;
    const fileName = `${semester.name}-events_${timeStamp}.xlsx`;
    const file = `${EXCEL_EXPORT_DIR}/${fileName}`;
    if (existsSync(file)) {
        return file;
    }
    // cleanup old files
    try {

        const oldFiles = readdirSync(`${EXCEL_EXPORT_DIR}/`).filter(f => f.startsWith(`${semester.name}-events `));
        oldFiles.forEach(f => {
            const file = `${EXCEL_EXPORT_DIR}/${f}`;
            rmSync(file);
        });
    } catch (error) /* istanbul ignore next */ {
        Logger.error(error);
    }
    
    const events = await prisma.event.findMany({
        where: {
            AND: {
                state: EventState.PUBLISHED,
                parentId: null,
                start: {
                    lte: semester.end
                },
                end: {
                    gte: semester.start
                }
            }
        },
        include: {
            departments: true
        }
    });
    const departments = await prisma.department.findMany();
    const _depNames = departments.map(dep => dep.name);
    const depNames = [...DEP_ORDER.filter(dep => _depNames.includes(dep)), ..._depNames.filter(dep => !_depNames.includes(dep)).sort()];

    const workbook = new Excel.Workbook();
    const worksheet = workbook.addWorksheet('Termine');
    const lang = 'de';
    const columns = [
        { header: translate('kw', lang), key: 'kw', width: 7, outlineLevel: 1 },
        { header: translate('weekday', lang), key: 'weekday', width: 15, outlineLevel: 1 },
        { header: translate('description', lang), key: 'description', width: 42, outlineLevel: 1 },
        { header: translate('dateStart', lang), key: 'date_s', width: 15, outlineLevel: 1 },
        { header: translate('timeStart', lang), key: 'time_s', width: 12, outlineLevel: 1 },
        { header: translate('dateEnd', lang), key: 'date_e', width: 15, outlineLevel: 1 },
        { header: translate('timeEnd', lang), key: 'time_e', width: 12, outlineLevel: 1 },
        { header: translate('location', lang), key: 'location', width: 20, outlineLevel: 1 },
        { header: translate('descriptionLong', lang), key: 'location', width: 20, outlineLevel: 1 },
        ...depNames.map((dep) => ({ header: dep, key: dep, width: 4, outlineLevel: 1, alignment: {textRotation: 90}})),
        { header: translate('bilingueLPsAffected', lang)},
        { header: translate('classes', lang), key: 'classes', width: 10, outlineLevel: 1 },
        { header: translate('affects', lang), key: 'audience', width: 10, outlineLevel: 1 },
        { header: translate('teachingAffected', lang), key: 'teachingAffected', width: 10, outlineLevel: 1 },
        { header: translate('deletedAt', lang), key: 'deletedAt', width: 15, outlineLevel: 1}
    ] satisfies typeof worksheet.columns;
    worksheet.addTable({
        name: translate('events', lang),
        ref: 'A1',
        headerRow: true,
        totalsRow: false,
        style: {
          theme: 'TableStyleMedium2',
          showRowStripes: true
        },
        columns: columns.map(c => ({ name: c.header, filterButton: true })),
        rows: events.sort((a, b) => a.start.getTime() - b.start.getTime()).map(e => {
            return [
                getKW(e.start),
                translate(DAYS[e.start.getDay()], lang),
                e.description,
                formatDate(e.start),
                formatTime(e.start, true),
                formatDate(e.end),
                formatTime(e.end, true),
                e.location, 
                e.descriptionLong,
                ...depNames.map((dep) => e.departments.find(d => d.name === dep) ? 1 : ''),
                e.affectsDepartment2 ? 1 : 0,
                [...e.classGroups.map(g => `${g}*`), ...e.classes].join(', '),
                e.audience,
                e.teachingAffected,
                e.deletedAt ? formatDate(e.deletedAt) : ''
            ]
        }),
      });
    worksheet.columns = columns;
    depNames.forEach((_, i) => {
        worksheet.getCell(1, 10 + i).alignment = { textRotation: -90, vertical: 'top', horizontal: 'left' }
    })
    
    await workbook.xlsx.writeFile(file);
    return file;
}

export default createExcel;