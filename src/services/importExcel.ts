import { EventAudience, EventState, TeachingAffected } from "@prisma/client";
import readXlsxFile from 'read-excel-file/node';
import prisma from '../prisma';
import { KlassName, mapLegacyClassName } from "./helpers/klassNames";
import { MINUTE_2_MS } from "./createExcel";

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
  audience: 15,
  teachingAffected: 16,
  deletedAt: 17
}

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
    const dummy = new Date();
    const [dd, mm, yyyy] = date.split('.');
    return new Date(Date.parse(`${yyyy}-${mm}-${dd}T00:00:00.000Z`));
  }
  date.setUTCHours(0);
  date.setUTCMinutes(0);
  date.setUTCSeconds(0);
  date.setUTCMilliseconds(0);
  return date;
}

export const importExcel = async (file: string, userId: string, jobId: string) => {
  const xlsx = await readXlsxFile(file, { dateFormat: 'YYYY-MM-DD' });
  const imports = xlsx.slice(1).map(async (e) => {
    if (!!e[COLUMNS.deletedAt]) {
      /** do not import deleted events... */
      return;
    }
    const start = toDate(e[COLUMNS.startDate] as string)!;
    const startTime = e[COLUMNS.startTime] as string;
    let allDay = !startTime;
    if (startTime) {
      const [hours, minutes] = extractTime(startTime);
      start.setUTCHours(hours);
      start.setUTCMinutes(minutes);
    }
    let ende = toDate(e[COLUMNS.endDate] as string);
    if (!ende) {
      ende = start
    }
    const endTime = e[COLUMNS.endTime] as string;
    if (allDay) {
      if (!ende) {
        ende = new Date(start.getTime());
      }
      ende.setUTCHours(23);
      ende.setUTCMinutes(59);
    } else if (!!endTime) {
      const [hours, minutes] = extractTime(endTime);
      ende.setUTCHours(hours);
      ende.setUTCMinutes(minutes);
    }

    
    const classesRaw = e[COLUMNS.classes] as string || '';

    /**
     * \d matches a digit (equivalent to [0-9])
     * \d matches a digit (equivalent to [0-9])
     * [a-zA-Z] matches any alphabetical character
     */
    const singleClasses = classesRaw.match(/(\d\d[a-zA-Z][a-zA-Z]?)($|\W+)/g)?.map((c) => c).map(c => c.replace(/\W+/g, ''));
    const groupedClasses = classesRaw.match(/(\d\d)[a-zA-Z][a-zA-Z][a-zA-Z]+/g)?.map((c) => c)?.map((c) => {
      if (!c || c.length < 3) {
        return;
      }
      const yr = c.substring(0, 2);
      const cls = c.substring(2).split('').map((c) => `${yr}${c}`);
      return cls;
    }).filter(c => !!c).reduce((a, b) => a!.concat(b!), []);
    const classes = [...new Set((singleClasses || []).concat(groupedClasses || []))].map(c => mapLegacyClassName(c)).filter(c => !!c) as KlassName[];

    return prisma.event.create({
      data: {
        description: e[COLUMNS.description] as string || '',
        descriptionLong: e[COLUMNS.descriptionLong] as string || '',
        location: e[COLUMNS.location] as string || '',
        start: start,
        end: ende || start,
        state: EventState.DRAFT,
        classes: classes,
        author: {
          connect: { id: userId }
        },
        job: {
          connect: { id: jobId }
        },
        teachingAffected: e[COLUMNS.teachingAffected] as TeachingAffected || TeachingAffected.YES,
        audience: e[COLUMNS.audience] as EventAudience || EventAudience.STUDENTS,
      }
    });
  });
  return await Promise.all(imports);
}
