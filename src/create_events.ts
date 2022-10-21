import { Departements, EventState, PrismaClient, Role } from "@prisma/client";
import readXlsxFile from 'read-excel-file/node';

const prisma = new PrismaClient();
async function main() {
  const xlsx = await readXlsxFile('/Users/balz/Documents/git_code/lebalz/events-api/rahmenterminplan.xlsx');
  const del = await prisma.event.deleteMany({});
  console.log(del);
  const user = await prisma.user.findUnique({where: {shortName: 'hfr'}});
  xlsx.slice(1).map(async (e) => {
    const start = e[3] as any as Date;
    const startTime = e[4] as String;
    let allDay = !startTime;
    if (startTime) {
      const [hours, minutes] = startTime.split(':').map((t) => Number.parseInt(t, 10));
      start.setUTCHours(hours);
      start.setUTCMinutes(minutes);
    }
    let ende = e[5] as any as Date;
    const endTime = e[6] as String;
    if (allDay) {
      if (!ende) {
        ende = new Date(start.getTime());
      }
      ende.setUTCHours(23);
      ende.setUTCMinutes(59);
      ende.setUTCSeconds(59);
    } else if (endTime) {
      const [hours, minutes] = endTime.split(':').map((t) => Number.parseInt(t, 10))
      ende.setUTCHours(hours);
      ende.setUTCMinutes(minutes);
    }
    const categories: Departements[] = []
    if (e[9]) {
      categories.push('GYM');
    }    
    if (e[10]) {
      categories.push('FMS');
    }
    if (e[11]) {
      categories.push('WMS');
    }
    const newRecord = await prisma.event.create({
      data: {
        description: e[2] as string || '',
        descriptionLong: e[12] as string || '',
        location: e[7] as string || '',
        start: start,
        end: ende || start,
        allDay: allDay,
        state: EventState.PUBLISHED,
        departements: categories,
        author: {
          connect: { id: user!.id }
        }
      }
    });
    console.log(newRecord);
  });
  // console.log(xlsx);
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());

//!  put a dollar-sign between "." and "disconnect"
