import { Department, EventState, PrismaClient, Role } from "@prisma/client";
import readXlsxFile from 'read-excel-file/node';

const prisma = new PrismaClient();

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

async function main() {
  const proms = ['rahmenterminplan_S1.xlsx', 'rahmenterminplan_S2.xlsx'].map(async (fname) => {
    const xlsx = await readXlsxFile(`./${fname}`);
    const del = await prisma.event.deleteMany({});
    console.log(del);
    const user = await prisma.user.findUnique({where: { email: 'simon.vonheugel@gbsl.ch' }});
    xlsx.slice(1).map(async (e) => {
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
    
      const categories: Department[] = [];
      if (e[9]) {
        categories.push('GBSL');
      }    
      if (e[10]) {
        categories.push('FMS');
      }
      if (e[11]) {
        categories.push('WMS');
      }
      const record = {
        data: {
          description: e[2] as string || '',
          descriptionLong: e[12] as string || '',
          location: e[7] as string || '',
          start: start,
          end: ende || start,
          allDay: allDay,
          state: EventState.PUBLISHED,
          departments: categories,
          author: {
            connect: { id: user!.id }
          }
        }
      }
      const newRecord = await prisma.event.create(record);
      console.log(newRecord);
    });
    // console.log(xlsx);
  })
  await Promise.all(proms);
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());

//!  put a dollar-sign between "." and "disconnect"
