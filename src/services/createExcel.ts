import { EventState } from "@prisma/client";
import prisma from "../prisma"
import Excel from 'exceljs';
import {existsSync, readdir, readdirSync, rmSync} from 'fs';


export const SEC_2_MS = 1000;
export const MINUTE_2_MS = 60 * SEC_2_MS;
export const HOUR_2_MS = 60 * MINUTE_2_MS;
export const DAY_2_MS = 24 * HOUR_2_MS; // 1000*60*60*24=86400000
export const WEEK_2_MS = 7 * DAY_2_MS;
export const DAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'] as const;
export const DAYS_LONG = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'] as const;

export const getKW = (date: Date) => {
    const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0));
    const dayNumber = date.getUTCDay() || 7;
    utcDate.setUTCDate(date.getUTCDate() + 4 - dayNumber);
    const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
    return Math.ceil(((utcDate.getTime() - yearStart.getTime()) / DAY_2_MS + 1) / 7);
}

export const formatTime = (date: Date) => {
    const hours = `${date.getHours()}`.padStart(2, '0');
    const minutes = `${date.getMinutes()}`.padStart(2, '0');
    return `${hours}:${minutes}`;
}

export const formatDate = (date: Date) => {
    const day = `${date.getDate()}`.padStart(2, '0');
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const year = `${date.getFullYear()}`.padStart(4, '0');

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
    const file = `./exports/${fileName}`;
    if (existsSync(file)) {
        return file;
    }
    // cleanup old files
    try {

        const oldFiles = readdirSync('./exports').filter(f => f.startsWith(`${semester.name}-events `));
        oldFiles.forEach(f => {
            const file = `./exports/${f}`;
            rmSync(file);
        });
    } catch (error) {
        console.log(error);
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
    const data = events.sort((a, b) => a.start.getTime() - b.start.getTime()).map(e => {
        return {
            kw: getKW(e.start),
            weekday: DAYS_LONG[e.start.getDay()],
            description: e.description,
            date_s: formatDate(e.start),
            time_s: formatTime(e.start),
            date_e: formatDate(e.end),
            time_e: formatTime(e.end),
            location: e.location,
            departments: e.departments.map(d => d.name).join(', '),
            gbsl: '',
            fms: '',
            wms: '',
            descriptionLong: e.descriptionLong,
            year: e.classGroups.join(', '),
            classes: e.classes.join(', ')
        }
    });

    const workbook = new Excel.Workbook();
    const worksheet = workbook.addWorksheet('Termine');
    worksheet.columns = [
        { header: 'KW', key: 'kw', width: 7, outlineLevel: 1 },
        { header: 'Wochentag', key: 'weekday', width: 15, outlineLevel: 1 },
        { header: 'Stichworte', key: 'description', width: 42, outlineLevel: 1 },
        { header: 'Datum Beginn', key: 'date_s', width: 15, outlineLevel: 1 },
        { header: 'Zeit Beginn', key: 'time_s', width: 12, outlineLevel: 1 },
        { header: 'Datum Ende', key: 'date_e', width: 15, outlineLevel: 1 },
        { header: 'Zeit Ende', key: 'time_e', width: 12, outlineLevel: 1 },
        { header: 'Ort', key: 'location', width: 20, outlineLevel: 1 },
        { header: 'Betroffene Lehrkräfte', key: 'departments', width: 20, outlineLevel: 1 },
        { header: 'GBSL', key: 'gbsl', width: 7, outlineLevel: 1 },
        { header: 'FMS', key: 'fms', width: 7, outlineLevel: 1 },
        { header: 'WMS', key: 'wms', width: 7, outlineLevel: 1 },
        { header: 'Beschreibung', key: 'descriptionLong', width: 42, outlineLevel: 1 },
        { header: 'Jahrgangsstufe', key: 'year', width: 10, outlineLevel: 1 },
        { header: 'Einzelne Klassen', key: 'classes', width: 32, outlineLevel: 1 },
    ];
    worksheet.addTable({
        name: 'Termine',
        ref: 'A1',
        headerRow: true,
        totalsRow: false,
        style: {
          theme: 'TableStyleMedium2',
          showRowStripes: true,
        },
        columns: [
            { name: 'KW', filterButton: true },
            { name: 'Wochentag', filterButton: true },
            { name: 'Stichworte', filterButton: true },
            { name: 'Datum Beginn', filterButton: true },
            { name: 'Zeit Beginn', filterButton: true },
            { name: 'Datum Ende', filterButton: true },
            { name: 'Zeit Ende', filterButton: true },
            { name: 'Ort', filterButton: true },
            { name: 'Betroffene Lehrkräfte', filterButton: true },
            { name: 'GBSL', filterButton: true },
            { name: 'FMS', filterButton: true },
            { name: 'WMS', filterButton: true },
            { name: 'Beschreibung', filterButton: true },
            { name: 'Jahrgangsstufe', filterButton: true },
            { name: 'Einzelne Klassen', filterButton: true },
        ],
        rows: data.map(i => Object.values(i))
      });
    
    await workbook.xlsx.writeFile(file);
    return file;
}

export default createExcel;