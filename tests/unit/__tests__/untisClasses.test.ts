import { Prisma } from "@prisma/client";
import UntisClasses from "../../../src/models/untisClasses";
import prisma from '../../../src/prisma';
import { generateUntisClass } from "../../factories/untisClass";

export const createUntisClass = async (props: Partial<Prisma.UntisClassUncheckedCreateInput>) => {
    return await prisma.untisClass.create({
        data: generateUntisClass(props)
    });
}

describe('UntisClass', () => {
    describe('all', () => {
        test('returns all untisClasses', async () => {
            // const teacherA = await createUntisTeacher({ name: 'fba' });
            // const teacherB = await createUntisTeacher({ name: 'fbb' });
            // const teacherC = await createUntisTeacher({ name: 'fbc' });
            const c24i = await createUntisClass({ name: '24i', 
                // teachers: {
                // connect: [
                //     { id: teacherA.id },
                //     { id: teacherC.id },
                // ]
                // }
            });
            const c25h = await createUntisClass({ name: '25h', 
            // teachers: {
                // connect: [
                //     { id: teacherA.id },
                //     { id: teacherB.id },
                // ]
            // }
            });
            await expect(UntisClasses.all()).resolves.toEqual([
                {
                    ...c24i,
                    lessonIds: [],
                    teacherIds: []
                },
                {
                    ...c25h,
                    lessonIds: [],
                    teacherIds: []
                }
            ])
        });
    });
});