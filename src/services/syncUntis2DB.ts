import { WebUntisSecretAuth, Base, WebAPITimetable } from 'webuntis';
import { authenticator as Authenticator } from 'otplib';
import { PrismaClient, UntisLesson } from "@prisma/client";

const untis = new WebUntisSecretAuth(
  process.env.UNTIS_SCHOOL!,
  process.env.UNTIS_USER!,
  process.env.UNTIS_SECRET!,
  process.env.UNTIS_BASE_URL!,
  'custom-identity',
  Authenticator
);

const DATE = '2023-02-13T00:00:00Z';
const prisma = new PrismaClient();


const all = <S, T>(items: S[], fn: (params: S) => Promise<T>) => {
  const promises = items.map(item => fn(item));
  return Promise.all(promises);
}

const series = <S, T>(items: S[], fn: (params: S) => Promise<T>) => {
  let result: T[] = [];
  return items.reduce((acc, item) => {
    acc = acc.then(() => {
      return fn(item).then(res => { result.push(res) });
    });
    return acc;
  }, Promise.resolve())
    .then(() => result);
}

const splitToChunks = <S>(items: S[], chunkSize = 50) => {
  const result: S[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    result.push(items.slice(i, i + chunkSize));
  }
  return result;
}

const chunks = <S, T>(items: S[], fn: (props: S) => Promise<T>, chunkSize = 50) => {
  let result: T[] = [];
  const chunks = splitToChunks(items, chunkSize);
  return series(chunks, chunk => {
    return all(chunk, fn)
      .then(res => result = result.concat(res))
  })
    .then(() => result);
}

const login = async () => {
  let success = await untis.login()
    .then(() => !!untis.sessionInformation?.sessionId)
    .catch((err) => {
      console.log(err);
      return false
    });
  if (success) {
    return true;
  } else {
    return false;
  }
}

const ensureLogin = async () => {
  let loggedIn = await login();
  let tries = 1;
  while (!loggedIn) {
    tries += 1;
    await new Promise(resolve => setTimeout(resolve, 2000));
    loggedIn = await login();
    console.log('Login Try', tries)
  }
  if (tries > 1) {
    console.log('Login Tries', tries);
  }
  return loggedIn;
}

const untisDMMHH = (hhmm: number, date: Date) => {
  return date.getUTCDay() * 10000 + hhmm;
}
const getWeekdayOffsetMS = (date: Date) => {
  const days = date.getUTCDay() - 1;
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  const seconds = date.getUTCSeconds();
  return days * 86400000 + hours * 3600000 + minutes * 60000 + seconds * 1000;
}

const fetchUntis = async () => {
  const data = await ensureLogin()
    .then(async (loggedIn) => {
      if (!loggedIn) {
        console.log('Login not successful');
        throw new Error('Login not successful');
      }
      console.log('Fetch Schoolyear')
      const sj = await untis.getLatestSchoolyear();
      return { schoolyear: sj }
    }).then(async (data) => {
      console.log('Fetch Latest Import Time');
      const t = await untis.getLatestImportTime();
      return { ...data, latestImportTime: t }
    }).then(async (data) => {
      console.log('Fetch Holidays');
      const holidays = await untis.getHolidays(true);
      const semester1 = holidays.find((h) => h.name.toLowerCase().includes('herbst'));
      const semester2 = holidays.find((h) => h.name.toLowerCase().includes('frühling'));
      const sj = new Date(data.schoolyear.startDate);
      const dateSem1Raw = `${semester1?.endDate || sj.getFullYear() * 10000 + 1101}`
      const dateSem2Raw = `${semester2?.endDate || (sj.getFullYear() + 1) * 10000 + 415}`
      const dateSem3Raw = `${(sj.getFullYear() + 1) * 10000 + 830}`
      const dateSem1 = new Date(`${dateSem1Raw.slice(0, 4)}-${dateSem1Raw.slice(4, 6)}-${dateSem1Raw.slice(6, 8)}T00:00:00.000Z`);
      const dateSem2 = new Date(`${dateSem2Raw.slice(0, 4)}-${dateSem2Raw.slice(4, 6)}-${dateSem2Raw.slice(6, 8)}T00:00:00.000Z`);
      const dateSem3 = new Date(`${dateSem3Raw.slice(0, 4)}-${dateSem3Raw.slice(4, 6)}-${dateSem3Raw.slice(6, 8)}T00:00:00.000Z`);
      return { ...data, holidays, semester_1: dateSem1, semester_2: dateSem2, semester_3: dateSem3 }
    }).then(async (data) => {
      console.log('Fetch Subjects');
      const subjects = await untis.getSubjects();
      return { ...data, subjects }
    }).then(async (data) => {
      console.log('Fetch Teachers');
      const teachers = await untis.getTeachers();
      return { ...data, teachers }
    }).then(async (data) => {
      console.log('Fetch Classes');
      const classes = await untis.getClasses(true, data.schoolyear.id);
      return { ...data, classes }
    }).then(async (data) => {
      console.log('Fetch Timetables');

      const s1 = chunks(
        data.classes.map((kl) => kl.id),
        (id) => untis.getTimetableForWeek(data.semester_1, id, Base.TYPES.CLASS, 2, true),
        50
      ).catch((e) => {
        console.log('Error fetching Semester 1', e);
        return [] as WebAPITimetable[][];
      });
      const s2 = chunks(
        data.classes.map((kl) => kl.id),
        (id) => untis.getTimetableForWeek(data.semester_2, id, Base.TYPES.CLASS, 2, true),
        50
      ).catch((e) => {
        console.log('Error fetching Semester 2', e);
        return [] as WebAPITimetable[][];
      });
      const s3 = chunks(
        data.classes.map((kl) => kl.id),
        (id) => untis.getTimetableForWeek(data.semester_3, id, Base.TYPES.CLASS, 2, true),
        50
      ).catch((e) => {
        console.log('Error fetching Semester 3', e);
        return [] as WebAPITimetable[][];
      });
      const [tt_s1, tt_s2, tt_s3] = await Promise.all([s1, s2, s3]);
      const flattend_s1 = tt_s1.reduce((clx, val) => clx.concat(val), []).filter((t) => t.lessonCode === 'LESSON');
      const flattend_s2 = tt_s2.reduce((clx, val) => clx.concat(val), []).filter((t) => t.lessonCode === 'LESSON');
      const flattend_s3 = tt_s3.reduce((clx, val) => clx.concat(val), []).filter((t) => t.lessonCode === 'LESSON');
      return { ...data, timetable_s1: flattend_s1, timetable_s2: flattend_s2, timetable_s3: flattend_s3 };
    }).then((data) => {
      Object.keys(data).forEach((key) => {
        console.log(key, (data as any)[key].length);
      });
      console.log('Holidays: ', data.holidays);
      console.log('Current School Year: ', data.schoolyear);
      console.log('Latest Import Time: ', new Date(data.latestImportTime));
      return data;
    }).finally(async () => {
      console.log('logout untis')
      return untis.logout()
      // return data
    });
  return data
}

export const syncUntis2DB = async () => {
  const data = await fetchUntis()
  if (data.timetable_s1.length === 0) {
    console.log('No Data');
    return
  }
  /** DELETE CURRENT DB STATE */
  const dropLessons = await prisma.untisLesson.deleteMany({});
  const dropClasses = prisma.untisClass.deleteMany({});
  const dropTeachers = prisma.untisTeacher.deleteMany({});
  const drops = await prisma.$transaction([dropClasses, dropTeachers]);
  console.log('Dropped', drops.map((d) => d.count).join(', '));
  /** SYNC db */

  /** CREATE CLASSES */
  const dbClasses = await prisma.untisClass.createMany({
    data: data.classes.map((c) => {
      return {
        id: c.id,
        name: c.name,
        sf: c.longName
      }
    })
  });

  /** CREATE TEACHERS */
  const dbTeachers = await prisma.untisTeacher.createMany({
    data: data.teachers.map((t) => {
      return {
        id: t.id,
        name: t.name,
        longName: t.longName,
        title: (t as any).title as string | '',
        active: (t as any).active as boolean || false,
      }
    })
  });

  let nextId = Math.max(...data.timetable_s1.map((t) => t.id), ...data.timetable_s2.map((t) => t.id), ...data.timetable_s3.map((t) => t.id)) + 1;
  const lessonIdSet = new Set<number>();

  const findSubject = (id: number) => {
    const sub = data.subjects.find((s) => s.id === id);
    return {
      subject: sub?.name || 'Unbekannt',
      description: sub?.longName || 'Unbekannt',
    }
  }
  console.log('Next ID', nextId);
  const extractLesson = (lesson: WebAPITimetable, semester: string): UntisLesson | undefined => {
    const date = new Date(lesson.date);
    if (lessonIdSet.has(lesson.id)) {
      return;
    }
    lessonIdSet.add(lesson.id);
    return {
      id: lesson.id,
      room: lesson.rooms.map((r) => r.element.name).join(', '),
      ...findSubject(lesson.subjects[0].id), /** there is always only one subject */
      semester: semester,
      weekDay: date.getUTCDay(),
      startDHHMM: untisDMMHH(lesson.startTime, date),
      endDHHMM: untisDMMHH(lesson.endTime, date)
    }
  }

  const tt1 = data.timetable_s1.map((t) => extractLesson(t, `${data.schoolyear.startDate.getFullYear()}HS`)).filter(l => l) as UntisLesson[];
  const tt2 = data.timetable_s2.map((t) => extractLesson(t, `${data.schoolyear.endDate.getFullYear()}FS`)).filter(l => l) as UntisLesson[];
  const tt3 = data.timetable_s3.map((t) => extractLesson(t, `${data.schoolyear.endDate.getFullYear()}HS`)).filter(l => l) as UntisLesson[];
  
  const dbLessons = await prisma.untisLesson.createMany({
    data: [
      ...tt1,
      ...tt2,
      ...tt3
    ]
  });



  /** CONNECT CLASSES TO LESSONS, CLASSES TO TEACHERS 
   * AND TEACHERS TO LESSONS 
  */

  const classes: { [key: number]: { lessons: { id: number }[], teachers: { id: number }[] } } = {};
  const teachers: { [key: number]: { id: number }[] } = {};
  [...data.timetable_s1, ...data.timetable_s2, ...data.timetable_s3].forEach((lesson) => {
    lesson.classes.forEach((cls) => {
      if (!classes[cls.id]) {
        classes[cls.id] = {
          lessons: [],
          teachers: []
        }
      }
      if (lessonIdSet.has(lesson.id)) {
        classes[cls.id].lessons.push({ id: lesson.id });
      } else {
        console.log('Lesson not found', lesson.id, findSubject(lesson.subjects[0].id), lesson.classes.map((c) => c.element.name).join(', '));
      }
      if (lesson.teachers.length > 0) {
        classes[cls.id].teachers.push(...lesson.teachers.map((t) => ({ id: t.id })).filter(t => t.id));
      }
    });
    lesson.teachers.forEach((tchr) => {
      if (!teachers[tchr.id]) {
        teachers[tchr.id] = []
      }
      if (lessonIdSet.has(lesson.id)) {
        teachers[tchr.id].push({ id: lesson.id });
      } else {
        console.log('Lesson not found', lesson.id, findSubject(lesson.subjects[0].id), lesson.classes.map((c) => c.element.name).join(', '));
      }
    })
  });

  const connectClasses = data.classes.map((cls) => {
    return prisma.untisClass.update({
      where: {
        id: cls.id
      },
      data: {
        lessons: {
          connect: classes[cls.id]?.lessons || undefined
        },
        teachers: {
          connect: classes[cls.id]!.teachers.length > 0 ? classes[cls.id]!.teachers : undefined
        }
      }
    })
  });
  const connectTeachers = data.teachers.map((tchr) => {
    if (!teachers[tchr.id] || teachers[tchr.id].length === 0) {
      return;
    }
    return prisma.untisTeacher.update({
      where: {
        id: tchr.id
      },
      data: {
        lessons: {
          connect: teachers[tchr.id] || undefined
        }
      }
    });
  });
  await Promise.all(connectClasses.concat(connectTeachers.filter(t => t) as any[]));
}