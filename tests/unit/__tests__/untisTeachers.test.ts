import { Prisma } from 'prisma/generated/client.js';
import Semesters from '../../../src/models/semester.js';
import prisma from 'src/prisma.js';
import untisTeachers from '../../../src/models/untisTeacher.js';
import { createSemester } from './semesters.test.js';
import { generateUntisLesson } from '../../factories/untisLesson.js';
import { generateUntisTeacher } from '../../factories/untisTeacher.js';
import _ from 'lodash';
import { prepareLesson, prepareTeacher } from '../../../src/models/untis.helpers.js';

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

    return await prisma.untisLesson.create({
        data: generateUntisLesson(sid, props)
    });
};
export const createUntisTeacher = async (
    props: Partial<Prisma.UntisTeacherUncheckedCreateInput>,
    lessons?: Partial<Prisma.UntisLessonUncheckedCreateInput>[]
) => {
    const lessns = await Promise.all((lessons || []).map(createUntisLesson));
    return prepareTeacher(
        await prisma.untisTeacher.create({
            data: generateUntisTeacher({
                lessons: { connect: lessns.map((l) => ({ id: l.id })) },
                ...props
            }),
            include: { user: { select: { id: true } } }
        })
    );
};

describe('UntisTeacher', () => {
    describe('all', () => {
        test('returns all untisClasses', async () => {
            const teacherABC = await createUntisTeacher({ name: 'abc' });
            const teacherCDF = await createUntisTeacher({ name: 'cdf' });
            await expect(untisTeachers.all()).resolves.toEqual([teacherABC, teacherCDF]);
        });
    });

    describe('findModel', () => {
        test('find untis teacher', async () => {
            const teacherABC = await createUntisTeacher({ name: 'abc' });
            await expect(untisTeachers.findModel(teacherABC.id)).resolves.toEqual({
                ...teacherABC,
                hasUser: false,
                lessons: []
            });
        });
        test('found untis teacher includes lessons', async () => {
            const teacherABC = await createUntisTeacher({ name: 'abc', longName: 'Foo Bar', title: 'M' }, [
                {
                    subject: 'M',
                    startHHMM: 920,
                    endHHMM: 1005,
                    room: 'D201',
                    semesterNr: 1,
                    weekDay: 2,
                    year: 2023,
                    description: 'falla'
                },
                {
                    subject: 'In',
                    startHHMM: 1025,
                    endHHMM: 1110,
                    room: 'D205',
                    semesterNr: 2,
                    weekDay: 3,
                    year: 2023,
                    description: 'dupla'
                }
            ]);
            const lessons = (
                await prisma.untisLesson.findMany({
                    include: { teachers: { select: { id: true } }, classes: true }
                })
            ).map(prepareLesson);
            expect(lessons).toHaveLength(2);
            const lesson_m = lessons.find((l) => l.subject === 'M')!;
            const lesson_in = lessons.find((l) => l.subject === 'In')!;
            const result = await untisTeachers.findModel(teacherABC.id);
            expect(result).toEqual({
                active: true,
                id: teacherABC.id,
                longName: 'Foo Bar',
                name: 'abc',
                title: 'M',
                hasUser: false,
                lessons: expect.any(Array)
            });
            expect(_.orderBy(result!.lessons, ['id'])).toEqual(_.orderBy([lesson_m, lesson_in], ['id']));
        });
    });
});
