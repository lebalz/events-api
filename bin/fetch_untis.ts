import fs from "fs";
import { WebUntis, WebUntisSecretAuth, Base } from 'webuntis';
import { authenticator as Authenticator } from 'otplib';
import Teachers from "../teachers.json";

const untis = new WebUntisSecretAuth(
  process.env.UNTIS_SCHOOL!,
  process.env.UNTIS_USER!,
  process.env.UNTIS_SECRET!,
  process.env.UNTIS_BASE_URL!,
  'custom-identity',
  Authenticator
);

const DATE = '2023-02-13T00:00:00Z';


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

const untisDate = (date: number, time: number) => {
  const date_raw = `${date}`
  const time_raw = `${time}`
  const year = date_raw.slice(0, 4)
  const month = date_raw.slice(4, 6)
  const day = date_raw.slice(6, 8)
  const hours = time_raw.padStart(4, '0').slice(0, 2);
  const minutes = time_raw.padStart(4, '0').slice(2, 4);
  return new Date(`${year}-${month}-${day}T${hours}:${minutes}:00.000Z`)
}
const getWeekdayOffsetMS = (date: Date) => {
  const days = date.getUTCDay() - 1;
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  const seconds= date.getUTCSeconds();
  return days * 86400000 + hours * 3600000 + minutes * 60000 + seconds * 1000;
}

const t0 = Date.now();
ensureLogin()
  .then((loggedIn) => {
    if (!loggedIn) {
      console.log('Shit!')
      throw new Error('Kack');
    }

    console.log('s0');
    return new Promise(resolve => setTimeout(resolve, 1000))
  })
  .then(() => {
    console.log("s1");
    return untis.getLatestSchoolyear().then((year) => ({ schoolyear: year }));
  })
  .then((data) => {
    console.log("s2");
    return untis.getSubjects().then((subjects) => {
      const subjs = subjects.map((s) => {
        return {
          id: s.id,
          name: s.name,
          alternate_name: s.alternateName,
          long_name: s.longName,
          active: s.active,
        };
      });
      return { subjects: subjs, ...data };
    });
  })
  .then((data) => {
    return untis.getTeachers().then((d) => {
      fs.writeFileSync("teachers-untis.json", JSON.stringify(d, undefined, 2), {
        encoding: "utf-8",
      });
      return { ...data, teachers: d };
    });
  })
  .then((data) => {
    console.log("s3");
    return untis.getDepartments().then((d) => ({ ...data, departments: d }));
  })
  .then((data) => {
    console.log("s4");
    return untis
      .getClasses(true, data.schoolyear.id)
      .then((c) => ({ ...data, classes: c }));
  })
  .then((data) => {
    console.log("s5");
    return chunks(
      data.classes.map((k) => k.id),
      (id) => untis.getTimetableForWeek(
        new Date(DATE),
        id,
        Base.TYPES.CLASS,
        2),
      50
    ).then(
      (tt) => {
        const ttt = tt.reduce((curr, prev) => [...prev, ...curr], []).filter(
          (e) => e.lessonCode === "LESSON" && e.subjects.length === 1
        )
        const lessonIds = new Set<number>();
        const lessons: {
          id: number;
          lesson_id: number;
          lesson_number: number;
          start_time: number;
          end_time: number;
          class_ids: number[];
          teacher_ids: number[];
          subject_id: number;
        }[] = [];
        fs.writeFileSync("events-untis.json", JSON.stringify(ttt, undefined, 2), {
          encoding: "utf-8",
        });

        ttt.forEach((e) => {
          // 19980118T230000
          const subj = e.subjects[0].element;
          const sdate = untisDate(e.date, e.startTime);
          const edate = untisDate(e.date, e.endTime);
          if (!lessonIds.has(e.id)) {
            lessonIds.add(e.id);
            lessons.push({
              id: e.id,
              lesson_id: e.lessonId,
              lesson_number: e.lessonNumber,
              start_time: getWeekdayOffsetMS(sdate),
              end_time: getWeekdayOffsetMS(edate),
              class_ids: e.classes.map((c) => c.id),
              teacher_ids: e.teachers.map((t) => t.element.id),
              subject_id: subj.id,
            });
          }
        });
        return {
          ...data,
          lessons: lessons
        }
      }
    )
  })
  .then((data) => {
    console.log("s7");
    const t = Date.now() - t0;
    fs.writeFileSync("data.json", JSON.stringify(data, undefined, 2), {
      encoding: "utf-8",
    });
    // console.log(JSON.stringify(timetable, undefined, 2))
    // console.log(timetable, unti.convertUntisTime(timetable));
    console.log("tt", t);
    // profit
  }).finally(() => {
    console.log('logout')
    return untis.logout()
  });
