import { EventState, Prisma } from "@prisma/client";
import readXlsxFile from 'read-excel-file/node';
import prisma from '../prisma';
import { toDepartmentName } from "./helpers/departmentNames";
import { KlassName } from "./helpers/klassNames";

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

    
    const classesRaw = e[COLUMNS.classes] as string || '';

    /**
     * \d matches a digit (equivalent to [0-9])
     * \d matches a digit (equivalent to [0-9])
     * \S matches any non-whitespace character
     */
    const singleClasses = classesRaw.match(/(\d\d\S)/g)?.map((c) => c);
    const groupedClasses = classesRaw.match(/(\d\d)\S\S+/g)?.map((c) => c)?.map((c) => {
      const yr = c.substring(0, 2);
      const cls = c.substring(2).split('').map((c) => `${yr}${c}`);
      return cls;
    }).reduce((a, b) => a.concat(b), []);
    const classes = [...new Set((singleClasses || []).concat(groupedClasses || []))];

    const classYearsRaw = (e[COLUMNS.classYears] as string || '').match(/(GYM|FMS|WMS)\d/g)?.map((c) => c) || [];
    const classYears = classYearsRaw.map((c) => Number.parseInt(c.charAt(3), 10));

    const departments: {
      where: Prisma.DepartmentWhereUniqueInput,
      create: (Prisma.Without<Prisma.DepartmentCreateWithoutEventsInput, Prisma.DepartmentUncheckedCreateWithoutEventsInput> & Prisma.DepartmentUncheckedCreateWithoutEventsInput)
    }[] = [];

    const depRaw = classes.map(c => toDepartmentName(c as KlassName)).filter(c => !!c);
    depRaw.forEach((d) => {
      departments.push({
        where: { name: d },
        create: { name: d }
      });
    });

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
