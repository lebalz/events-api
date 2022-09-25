import unti from "webuntis";
import fs from "fs";

const untis = new unti.WebUntisSecretAuth(
  process.env.UNTIS_SCHOOL!,
  process.env.UNTIS_USER!,
  process.env.UNTIS_SECRETE!,
  process.env.UNTIS_BASE_URL!
);

const DATE = '2022-09-13';

const t0 = Date.now();
untis
  .login()
  .then(() => {
    return untis.getLatestSchoolyear().then((year) => ({ schoolyear: year }));
  })
  .then((data) => {
    return untis.getSubjects().then((subjects) => {
        const subjs = subjects.map((s) => {
            return {
                id: s.id,
                name: s.name,
                alternate_name: s.alternateName,
                long_name: s.longName,
                active: s.active
            }
        })
        return {subjects: subjs, ...data};
    })
  })
  // .then((data) => {
  //   return untis.getTeachers().then((d) => {
  //     // console.log('Teachers', d);
  //     return {...data};
  //   })
  // })
  .then((data) => {
    return untis.getDepartments().then((d) => ({...data, departments: d}))
  })
  .then((data) => {
    return untis.getClasses(true, data.schoolyear.id).then((c) => ({ ...data, classes: c }));
  })
  .then((data) => {
    const weekDate = new Date(DATE);
    const first = weekDate.getDate() - weekDate.getDay() + 1;
    const monday = new Date(weekDate.setDate(first)); // time shift in ms. to a weeks start (monday).
    const proms = data.classes.map((klass) => {
      return untis
        .getTimetableForWeek(
          new Date('2022-09-13'),
          klass.id,
          unti.TYPES.CLASS,
          2
        )
        .then((tt) => {
          const teachers: {[key: string]: {
            id: number,
            name: string,
            longName?: string,
            type: string,
            displayname?: string,
            externalKey?: string,
          }} = {}
          const timetable = tt
            .filter((e) => e.lessonCode === "LESSON" && e.subjects.length === 1)
            .map((e) => {
              const subj = e.subjects[0].element;
              const sdate = `${e.date}`;
              const year = Number.parseInt(sdate.substring(0, 4), 10);
              const month = Number.parseInt(sdate.substring(4, 6), 10);
              const day = Number.parseInt(sdate.substring(6, 8), 10);
              const stime = `${e.startTime}`;
              const etime = `${e.endTime}`;
              const startHH = Number.parseInt(stime.substring(0, 2));
              const startMM = Number.parseInt(stime.substring(2, 4));
              const endHH = Number.parseInt(etime.substring(0, 2));
              const endMM = Number.parseInt(etime.substring(2, 4));
              console.log(e.teachers);
              return {
                id: e.id,
                lesson_id: e.lessonId,
                lesson_number: e.lessonNumber,
                start_time: (new Date(year, month - 1, day, startHH, startMM)).getTime() - monday.getTime(),
                end_time: (new Date(year, month - 1, day, endHH, endMM)).getTime() - monday.getTime(),
                class_ids: e.classes.map((c) => c.id),
                teachers: e.teachers.map((t) => t.element.name),
                subject_id: subj.id,
              };
            });
          return { class: klass.id, timetable: timetable };
        });
    });
    return Promise.all(proms).then((tt) => ({...data, timetables: tt}));
  })
  .then((data) => {
    const t = Date.now() - t0;
    fs.writeFileSync("data.json", JSON.stringify(data, undefined, 2), {
      encoding: "utf-8",
    });
    // console.log(JSON.stringify(timetable, undefined, 2))
    // console.log(timetable, unti.convertUntisTime(timetable));
    console.log("tt", t);
    // profit
  });
