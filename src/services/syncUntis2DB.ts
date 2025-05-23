import { WebAPITimetable } from 'webuntis';
import type { Department, Prisma, Semester, UntisLesson } from '@prisma/client';
import prisma from '../prisma';
import {
    ClassLetterMap,
    Colors,
    DepartmentLetter,
    DepartmentLetterMap,
    Departments,
    fromDisplayClassName,
    SchoolDepartments
} from './helpers/departmentNames';
import { KlassName, mapLegacyClassName } from './helpers/klassNames';
import Logger from '../utils/logger';
import { UntisData, fetchUntis as defaultFetchUntis } from './fetchUntis';
import { getClassYear } from './helpers/untisKlasse';

export const toDisplayLetter = (letter: DepartmentLetter) => {
    return letter === DepartmentLetter.FMPaed
        ? DepartmentLetter.FMS
        : letter === DepartmentLetter.MSOP
          ? DepartmentLetter.ECG
          : undefined;
};

export const syncUntis2DB = async (
    semesterId: string,
    fetchUntis: (semester: Semester) => Promise<UntisData> = defaultFetchUntis
) => {
    const semester = await prisma.semester.findUnique({
        where: { id: semesterId },
        include: { lessons: { include: { classes: true } } }
    });
    /* istanbul ignore if */
    if (!semester) {
        throw new Error('No Semester found');
    }
    const data = await fetchUntis(semester);

    /* istanbul ignore if */
    if (data.timetable.length === 0) {
        Logger.info('No Data');
        throw new Error(
            `No timetable data for semester "${semester.name}" in the Week of ${semester.untisSyncDate.toISOString().slice(0, 10)} found`
        );
    }
    const User2Teacher = await prisma.user.findMany({
        where: {
            untisId: {
                not: null
            }
        },
        select: {
            untisId: true,
            id: true
        }
    });
    const CurrentUntisTeachers = await prisma.untisTeacher.findMany({});

    /** UPSERT DEPARTMENTS */
    const upsertDepPromise: Prisma.PrismaPromise<Department>[] = [];
    (Object.keys(SchoolDepartments) as (keyof typeof Departments)[]).forEach((d) => {
        const school = SchoolDepartments[d];
        const color = Colors[d];
        const letter = DepartmentLetterMap[d];
        const displayLetter = toDisplayLetter(letter);
        const clsLetters = ClassLetterMap[d];
        if (school.dep_1 || school.dep_2) {
            return;
        }
        upsertDepPromise.push(
            prisma.department.upsert({
                where: { name: school.main },
                update: {},
                create: {
                    name: school.main,
                    color: color,
                    letter: letter,
                    displayLetter: displayLetter,
                    classLetters: [...clsLetters]
                }
            })
        );
    });
    await Promise.all(upsertDepPromise);
    const schoolDepartments = await prisma.department.findMany({});
    upsertDepPromise.splice(0, upsertDepPromise.length);

    (Object.keys(SchoolDepartments) as (keyof typeof Departments)[]).forEach((d) => {
        const school = SchoolDepartments[d];
        const color = Colors[d];
        const letter = DepartmentLetterMap[d];
        const displayLetter = toDisplayLetter(letter);
        const clsLetters = ClassLetterMap[d];
        if (!school.dep_1 && !school.dep_2) {
            return;
        }
        const dep1 = schoolDepartments.find((dep) => dep.name === school.dep_1);
        const dep2 = schoolDepartments.find((dep) => dep.name === school.dep_2);
        upsertDepPromise.push(
            prisma.department.upsert({
                where: { name: school.main },
                update: {},
                create: {
                    name: school.main,
                    color: color,
                    letter: letter,
                    displayLetter: displayLetter,
                    classLetters: [...clsLetters],
                    department1: dep1 ? { connect: { id: dep1.id } } : undefined,
                    department2: dep2 ? { connect: { id: dep2.id } } : undefined
                }
            })
        );
    });

    await Promise.all(upsertDepPromise);
    const departments = await prisma.department.findMany({});

    const dbTransactions: Prisma.PrismaPromise<any>[] = [];
    /** DELETE CURRENT DB STATE */
    const dropLessons = prisma.untisLesson.deleteMany({ where: { semesterId: semesterId } });
    dbTransactions.push(dropLessons);

    /** SYNC db */

    /** UPSERT CLASSES - class names might show up multiple time - normalize them here... */
    const currentClasses = await prisma.untisClass.findMany({});
    const classIdMap = new Map<number, number>();
    data.classes.forEach((c) => {
        const isoUntisName = mapLegacyClassName(c.name) as KlassName;
        const isoName = fromDisplayClassName(isoUntisName, departments);
        const currentClass = currentClasses.find((cc) => cc.name === isoName && cc.id !== c.id);
        if (currentClass) {
            classIdMap.set(c.id, currentClass.id);
            dbTransactions.push(
                prisma.untisClass.update({
                    where: { name: isoName },
                    data: {
                        sf: c.longName,
                        displayName: c.name === isoName ? null : c.name
                    }
                })
            );
            return;
        }

        const data = {
            name: isoName,
            displayName: c.name === isoName ? null : c.name,
            year: getClassYear(c),
            sf: c.longName
        };
        const klass = prisma.untisClass.upsert({
            where: { id: c.id },
            update: data,
            create: {
                id: c.id,
                ...data
            }
        });
        dbTransactions.push(klass);
    });
    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'test') {
        Logger.info('Classes: idMap', classIdMap);
    }

    const unknownClassDepartments: { [key: string]: any } = {};

    /** CONNECT CLASSES TO DEPARTMENTS */
    data.classes.forEach((c) => {
        const isoUntisName = mapLegacyClassName(c.name) as KlassName;
        const isoName = fromDisplayClassName(isoUntisName, departments);
        const dLetter = isoName.slice(2, 3); /** third letter, e.g. 26gA --> g */
        const cLetter = isoName.slice(3, 4); /** fourth letter, e.g. 26gA --> A */
        const department = departments.find((d) => d.letter === dLetter && d.classLetters.includes(cLetter));
        /* istanbul ignore if */
        if (!department) {
            Logger.info(
                `No Department found for ${dLetter}, ${c.id}, ${c.longName}, ${c.active}, ${c.name}, ${isoName}`
            );
            unknownClassDepartments[c.name] = {
                classId: c.id,
                className: c.name,
                description: c.longName,
                classDepartmentLetter: dLetter,
                classLetter: cLetter
            };
            if (c.name !== isoName) {
                unknownClassDepartments[c.name].isoClassName = isoName;
            }
            return;
        }
        const update = prisma.untisClass.update({
            where: { id: classIdMap.get(c.id) || c.id },
            data: {
                department: {
                    connect: { id: department.id }
                }
            }
        });
        dbTransactions.push(update);
    });

    /** check user-id missmatches */
    const missmatches = data.teachers
        .filter((t) => CurrentUntisTeachers.find((ct) => ct.name === t.name && ct.id !== t.id))
        .map((t) => ({
            name: t.name,
            currentId: CurrentUntisTeachers.find((ct) => ct.name === t.name)!.id,
            newId: t.id,
            userId: User2Teacher.find((u) => u.untisId === t.id)?.id
        }));
    if (missmatches.length > 0) {
        Logger.info(
            `Teacher Missmatches: Untis-ID's changed for ${missmatches.map((m) => `${m.name} (${m.currentId} -> ${m.newId})`)}`
        );
    }
    const rmUntisTeacherLinks = prisma.user.updateMany({
        data: {
            untisId: null
        },
        where: {
            id: {
                in: missmatches.filter((m) => !!m.userId).map((m) => m.userId!)
            }
        }
    });
    dbTransactions.push(rmUntisTeacherLinks);
    /** delete missmatched users */
    const rmMissmatchedUsers = prisma.untisTeacher.deleteMany({
        where: {
            id: {
                in: missmatches.map((m) => m.currentId!)
            }
        }
    });
    dbTransactions.push(rmMissmatchedUsers);

    /** UPSERT TEACHERS */
    data.teachers.forEach((t) => {
        const data = {
            name: t.name,
            longName: t.longName,
            title: (t as any).title as string | '',
            active: ((t as any).active as boolean) || false
        };
        const tchr = prisma.untisTeacher.upsert({
            where: { id: t.id },
            update: {
                ...data
            },
            create: {
                id: t.id,
                ...data
            }
        });
        dbTransactions.push(tchr);
    });

    /** CONNECT DB USERS TO TEACHERS  */
    data.teachers.forEach((t) => {
        const user = User2Teacher.find((u) => u.untisId === t.id);
        if (user) {
            const update = prisma.user.update({
                where: { id: user.id },
                data: {
                    untisId: t.id
                }
            });
            dbTransactions.push(update);
        }
    });
    missmatches.forEach((m) => {
        if (m.userId) {
            const update = prisma.user.update({
                where: { id: m.userId },
                data: {
                    untisId: m.newId
                }
            });
            dbTransactions.push(update);
        }
    });

    let nextId = Math.max(...data.timetable.map((t) => t.id)) + 1;
    const lessonIdSet = new Set<number>();

    const findSubject = (id: number) => {
        const sub = data.subjects.find((s) => s.id === id);
        return {
            subject: sub?.name || 'Unbekannt',
            description: sub?.longName || 'Unbekannt'
        };
    };
    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'test') {
        Logger.info(`Next ID: ${nextId}`);
    }
    const extractLesson = (lesson: WebAPITimetable): UntisLesson | undefined => {
        const year = lesson.date / 10000;
        const month = (lesson.date % 10000) / 100;
        const day = lesson.date % 100;
        const date = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
        /* istanbul ignore if */
        if (lessonIdSet.has(lesson.id)) {
            return;
        }
        lessonIdSet.add(lesson.id);
        /* istanbul ignore if */
        if (lesson.subjects.length === 0) {
            Logger.info(`No Subject found for ${JSON.stringify(lesson, null, 2)}`);
            return;
        }

        return {
            id: lesson.id,
            room: lesson.rooms.map((r) => r.element.name).join(', '),
            ...findSubject(lesson.subjects[0].id) /** there is always only one subject */,
            semesterNr:
                semester.start.getMonth() > 5
                    ? 1
                    : 2 /** getMonth() returns zero-based month, e.g. january->0, february->1,... */,
            year: semester.untisSyncDate.getFullYear(),
            semesterId: semesterId,
            weekDay: date.getUTCDay(),
            startHHMM: lesson.startTime,
            endHHMM: lesson.endTime
        };
    };

    /** UPSERT LESSONS */
    data.timetable.forEach((lesson) => {
        const lsnData = extractLesson(lesson);
        /* istanbul ignore next */
        if (!lsnData) {
            return;
        }
        const lsn = prisma.untisLesson.upsert({
            where: { id: lesson.id },
            update: lsnData,
            create: lsnData
        });
        dbTransactions.push(lsn);
    });

    /** CONNECT CLASSES TO LESSONS, CLASSES TO TEACHERS
     * AND TEACHERS TO LESSONS
     */

    const classes: { [key: number]: { lessons: { id: number }[]; teachers: { id: number }[] } } = {};
    const teachers: { [key: number]: { id: number }[] } = {};
    [...data.timetable].forEach((lesson) => {
        lesson.classes.forEach((cls) => {
            const cid = classIdMap.get(cls.id) || cls.id;
            if (!classes[cid]) {
                classes[cid] = {
                    lessons: [],
                    teachers: []
                };
            }
            /* istanbul ignore else */
            if (lessonIdSet.has(lesson.id)) {
                classes[cid].lessons.push({ id: lesson.id });
            } else {
                Logger.info(
                    `Lesson not found: ${lesson.id}, ${findSubject(lesson.subjects[0].id)}, ${lesson.classes.map((c) => c.element.name).join(', ')}`
                );
            }
            if (lesson.teachers.length > 0) {
                classes[cid].teachers.push(...lesson.teachers.map((t) => ({ id: t.id })).filter((t) => t.id));
            }
        });
        lesson.teachers.forEach((tchr) => {
            if (!teachers[tchr.id]) {
                teachers[tchr.id] = [];
            }
            /* istanbul ignore else */
            if (lessonIdSet.has(lesson.id)) {
                teachers[tchr.id].push({ id: lesson.id });
            } else {
                Logger.info(
                    'Lesson not found',
                    lesson.id,
                    findSubject(lesson.subjects[0].id),
                    lesson.classes.map((c) => c.element.name).join(', ')
                );
            }
        });
    });

    data.classes.forEach((cls) => {
        const cid = classIdMap.get(cls.id) || cls.id;
        const update = prisma.untisClass.update({
            where: {
                id: cid
            },
            data: {
                lessons: {
                    connect: classes[cid]?.lessons || undefined
                },
                teachers: {
                    connect: classes[cid]?.teachers?.length > 0 ? classes[cid]!.teachers : undefined
                }
            }
        });
        dbTransactions.push(update);
    });
    data.teachers.forEach((tchr) => {
        /* istanbul ignore next */
        if (!teachers[tchr.id] || teachers[tchr.id].length === 0) {
            return;
        }
        const update = prisma.untisTeacher.update({
            where: {
                id: tchr.id
            },
            data: {
                lessons: {
                    connect: teachers[tchr.id] || undefined
                }
            }
        });
        dbTransactions.push(update);
    });
    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'test') {
        Logger.info(`TRANSACTION COUNT: ${dbTransactions.length}`);
    }
    await prisma.$transaction(dbTransactions);
    const summary: { [key: string]: number | string | Object } = {
        schoolyear: `${data.schoolyear.name} [${data.schoolyear.startDate.toISOString().slice(0, 10)} - ${data.schoolyear.endDate.toISOString().slice(0, 10)}]`,
        syncedWeek: semester.untisSyncDate.toISOString().slice(0, 10)
    };
    Object.keys(data).forEach((key) => {
        if (key === 'timetable') {
            summary['#lessons'] = lessonIdSet.size;
        } else {
            const len = (data as any)[key].length;
            if (len) {
                summary[`#${key}`] = len;
            }
        }
    });
    /* istanbul ignore next */
    if (Object.keys(unknownClassDepartments).length > 0) {
        summary['unknownClassDepartments'] = unknownClassDepartments;
    }
    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'test') {
        Logger.info('Summary', summary);
    }
    return summary;
};
