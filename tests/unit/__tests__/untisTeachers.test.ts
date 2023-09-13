import { JobType, Prisma, Role, User } from "@prisma/client";
import Semesters from "../../../src/models/semesters";
import prismock from "../__mocks__/prismockClient";
import { createUser } from "./users.test";
import { HTTP400Error, HTTP403Error, HTTP404Error } from "../../../src/utils/errors/Errors";
import { PrismockClientType } from "prismock/build/main/lib/client";
import untisTeachers from "../../../src/models/untisTeachers";
import { createSemester } from "./semesters.test";
import { generateUntisLesson } from "../../factories/untisLesson";
import { generateUntisTeacher } from "../../factories/untisTeacher";

export const createUntisLesson = async (props: Partial<Prisma.UntisLessonUncheckedCreateInput>) => {
    let sid: string = '';
    if (props.semesterId) {
        sid = props.semesterId;
    } else {
        const semesters = await Semesters.all();
        if (semesters.length > 0) {
            sid = semesters[0].id;
        } else {
            const sem = await createSemester({});
            sid = sem.id;
        }
    }

    return await prismock.untisLesson.create({
        data: generateUntisLesson(sid, props)
    });
}

export const createUntisTeacher = async (props: Partial<Prisma.UntisTeacherUncheckedCreateInput>, lessons?: Partial<Prisma.UntisLessonUncheckedCreateInput>[]) => {
    const lessns = await Promise.all((lessons || []).map(createUntisLesson));
    return await prismock.untisTeacher.create({
        data: generateUntisTeacher({ lessons: { connect: lessns.map((l) => ({ id: l.id })) }, ...props })
    });
}

describe('UntisTeacher', () => {
    describe('all', () => {
        test('returns all untisClasses', async () => {
            const teacherABC = await createUntisTeacher({ name: 'abc' });
            const teacherCDF = await createUntisTeacher({ name: 'cdf' });
            await expect(untisTeachers.all()).resolves.toEqual([
                {
                    ...teacherABC,
                    classes: [],
                    lessons: [],
                    user: null
                },
                {
                    ...teacherCDF,
                    classes: [],
                    lessons: [],
                    user: null
                }
            ])

        });
    });

    describe('findModel', () => {
        test('find untis teacher', async () => {
            const teacherABC = await createUntisTeacher({ name: 'abc' });
            await expect(untisTeachers.findModel(teacherABC.id)).resolves.toEqual({
                ...teacherABC,
                lessons: []
            })
        });
        test('found untis teacher includes lessons', async () => {
            const teacherABC = await createUntisTeacher(
                { name: 'abc', longName: 'Foo Bar', title: 'M' },
                [
                    { subject: 'M', startHHMM: 920, endHHMM: 1005, room: 'D201', semesterNr: 1, weekDay: 2, year: 2023, description: 'falla', id: 1 },
                    { subject: 'In', startHHMM: 1025, endHHMM: 1110, room: 'D205', semesterNr: 2, weekDay: 3, year: 2023, description: 'dupla', id: 2 }
                ]
            );

            await expect(untisTeachers.findModel(teacherABC.id)).resolves.toEqual({
                active: true,
                id: 1,
                longName: 'Foo Bar',
                name: 'abc',
                title: 'M',
                lessons: [{
                    classes: [],
                    description: 'falla',
                    startHHMM: 920,
                    endHHMM: 1005,
                    id: 1,
                    room: 'D201',
                    semesterId: expect.any(String),
                    semesterNr: 1,
                    subject: 'M',
                    teachers: [
                        { id: 1 }
                    ],
                    weekDay: 2,
                    year: 2023,
                },
                {
                    classes: [],
                    description: 'dupla',
                    startHHMM: 1025,
                    endHHMM: 1110,
                    id: 2,
                    room: 'D205',
                    semesterId: expect.any(String),
                    semesterNr: 2,
                    subject: 'In',
                    teachers: [
                        { id: 1 }
                    ],
                    weekDay: 3,
                    year: 2023,
                }]
            })
        });
    })
});