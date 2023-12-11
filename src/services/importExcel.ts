import { EventAudience, TeachingAffected } from "@prisma/client";
import readXlsxFile from 'read-excel-file/node';
import { ImportRawEvent } from "./importEvents";

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

export const importExcel = async (file: string): Promise<ImportRawEvent[]> => {
  const xlsx = await readXlsxFile(file, { dateFormat: 'YYYY-MM-DD' });
  return xlsx.slice(1).filter((e => !!e[COLUMNS.deletedAt])).map((e) => {
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
    return {
      description: e[COLUMNS.description] as string || '',
      descriptionLong: e[COLUMNS.descriptionLong] as string || '',
      location: e[COLUMNS.location] as string || '',
      start: start,
      end: ende || start,
      classesRaw: e[COLUMNS.classes] as string || '',
      teachingAffected: e[COLUMNS.teachingAffected] as TeachingAffected,
      audience: e[COLUMNS.audience] as EventAudience,
    } as ImportRawEvent;
  });
}
