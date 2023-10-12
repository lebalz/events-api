import { PrismaClient, User } from '@prisma/client';
import { getNameFromEmail } from '../src/helpers/email';
const prisma = new PrismaClient();



async function main() {
    if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test') {
        return;
    }
    
    const { USER_EMAIL, USER_ID, ADMIN_EMAIL, ADMIN_ID } = process.env;
    let user: User | null = null;
    let admin: User | null = null;
    if (USER_EMAIL && USER_ID) {
        const {firstName, lastName} = getNameFromEmail(USER_EMAIL);
        user = await prisma.user.upsert({
            where: { id: USER_ID },
            update: {},
            create: { email: USER_EMAIL, id: USER_ID, firstName: firstName, lastName: lastName, role: 'USER'},
        });
        console.log('CREATED USER', user);
    }
    if (ADMIN_EMAIL && ADMIN_ID) {
        const {firstName, lastName} = getNameFromEmail(ADMIN_EMAIL);
        admin = await prisma.user.upsert({
            where: { id: ADMIN_ID },
            update: {},
            create: { email: ADMIN_EMAIL, id: ADMIN_ID, firstName: firstName, lastName: lastName, role: 'ADMIN'},
        });
        console.log('CREATED ADMIN', admin);
    }
    // create a semester
    const hs = {
        start: new Date('2023-08-21T00:00:00.000Z'),
        end: new Date('2024-02-04T23:59:59.000Z'),
        name: 'HS2023',
        untisSyncDate: new Date('2023-09-25')
    }
    const semesterHS = await prisma.semester.upsert({
        where: { id: 'e98eed75-e2a1-473f-be37-adb412e6be4e'},
        update: {...hs},
        create: {
            id: 'e98eed75-e2a1-473f-be37-adb412e6be4e',
            ...hs
        }
    });
    const fs = {
        start: new Date('2024-02-05T00:00:00.000Z'),
        end: new Date('2024-08-11T23:59:59.000Z'),
        name: 'FS2024',
        untisSyncDate: new Date('2024-02-19')
    }
    const semesterFS = await prisma.semester.upsert({
        where: { id: '169a5d47-b698-4006-80c0-34bd99c27603'},
        update: {...fs},
        create: {
            id: '169a5d47-b698-4006-80c0-34bd99c27603',
            ...fs
        }
    });
    console.log('CREATED SEMESTERS', semesterHS, semesterFS);

    
    //  /** IMPORT terminpläne in bin/excel */
    //  const seedFiles = fs.readdirSync('./bin/excel');
    //  const promises = seedFiles.filter(file => file.endsWith('.xlsx')).map(async xlsx => {
    //      const fname = `./bin/excel/${xlsx}`;
    //      const importJob = await prisma.job.create({
    //          data: {
    //              type: 'IMPORT',
    //              user: { connect: { id: user.id } },
    //              filename: xlsx,
    //              state: 'DONE'
    //          }
    //      });
    //      return importExcel(fname, user.id, importJob.id);
    //  });
    //  await Promise.all(promises);
     
}


main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })