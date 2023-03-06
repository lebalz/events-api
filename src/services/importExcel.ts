import { EventState, Prisma } from "@prisma/client";
import readXlsxFile from 'read-excel-file/node';
import prisma from '../prisma';

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
    const start = e[3] as any as Date;
    const startTime = e[4] as string;
    let allDay = !startTime;
    if (startTime) {
      const [hours, minutes] = extractTime(startTime);
      start.setUTCHours(hours);
      start.setUTCMinutes(minutes);
    }
    let ende = e[5] as any as Date;
    if (!ende) {
      ende = start
    }
    const endTime = e[6] as string;
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
    if (e[9]) {
      departments.push({
        create: { name: 'GBSL' },
        where: { name: 'GBSL' }
      });
    }
    if (e[10]) {
      departments.push({
        create: { name: 'FMS' },
        where: { name: 'FMS' }
      });
    }
    if (e[11]) {
      departments.push({
        create: { name: 'WMS' },
        where: { name: 'WMS' }
      });
    }
    return prisma.event.create({
      data: {
        description: e[2] as string || '',
        descriptionLong: e[12] as string || '',
        location: e[7] as string || '',
        start: start,
        end: ende || start,
        state: EventState.DRAFT,
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
