import { EventState, Prisma } from "@prisma/client";
import readXlsxFile from 'read-excel-file/node';
import prisma from '../prisma';

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
  classes: 14
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

export const importExcel = async (file: string, userId: string, jobId: string) => {
  const xlsx = await readXlsxFile(file);
  const imports = xlsx.slice(1).map(async (e) => {
    const start = e[COLUMNS.startDate] as any as Date;
    const startTime = e[COLUMNS.startTime] as string;
    let allDay = !startTime;
    if (startTime) {
      const [hours, minutes] = extractTime(startTime);
      start.setUTCHours(hours);
      start.setUTCMinutes(minutes);
    }
    let ende = e[COLUMNS.endDate] as any as Date;
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
      ende.setUTCSeconds(59);
    } else if (!!endTime) {
      const [hours, minutes] = extractTime(endTime);
      ende.setUTCHours(hours);
      ende.setUTCMinutes(minutes);
    }

    const departments: {
      where: Prisma.DepartmentWhereUniqueInput,
      create: (Prisma.Without<Prisma.DepartmentCreateWithoutEventsInput, Prisma.DepartmentUncheckedCreateWithoutEventsInput> & Prisma.DepartmentUncheckedCreateWithoutEventsInput)
    }[] = [];
    if (e[COLUMNS.gbsl]) {
      departments.push({
        create: { name: 'GBSL' },
        where: { name: 'GBSL' }
      });
    }
    if (e[COLUMNS.fms]) {
      departments.push({
        create: { name: 'FMS' },
        where: { name: 'FMS' }
      });
    }
    if (e[COLUMNS.wms]) {
      departments.push({
        create: { name: 'WMS' },
        where: { name: 'WMS' }
      });
    }
    const classesRaw = e[COLUMNS.classes] as string || '';

    /**
     * \d matches a digit (equivalent to [0-9])
     * \d matches a digit (equivalent to [0-9])
     * \S matches any non-whitespace character
     */
    const classes = classesRaw.match(/(\d\d\S)/g)?.map((c) => c);

    const classYearsRaw = (e[COLUMNS.classYears] as string || '').match(/(GYM|FMS|WMS)\d/g)?.map((c) => c) || [];
    const classYears = classYearsRaw.map((c) => Number.parseInt(c.charAt(3), 10));

    return prisma.event.create({
      data: {
        description: e[COLUMNS.description] as string || '',
        descriptionLong: e[COLUMNS.descriptionLong] as string || '',
        location: e[COLUMNS.location] as string || '',
        start: start,
        end: ende || start,
        state: EventState.DRAFT,
        classes: classes,
        classYears: classYears,
        author: {
          connect: { id: userId }
        },
        job: {
          connect: { id: jobId }
        },
        departments: {
          connectOrCreate: departments
        }

      }
    });
  });
  return await Promise.all(imports);
}

//!  put a dollar-sign between "." and "disconnect"
