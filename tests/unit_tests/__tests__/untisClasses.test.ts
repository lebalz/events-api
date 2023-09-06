import { JobType, Prisma, Role, User } from "@prisma/client";
import UntisClasses from "../../../src/models/untisClasses";
import prismock from "../__mocks__/prismockClient";
import { createUser } from "./users.test";
import { HTTP400Error, HTTP403Error, HTTP404Error } from "../../../src/utils/errors/Errors";
import { createUntisTeacher } from "./untisTeachers.test";
import { PrismockClientType } from "prismock/build/main/lib/client";

export const createUntisClass = async (props: Partial<Prisma.UntisClassUncheckedCreateInput>) => {
    return await prismock.untisClass.create({
        data: {
            name: '25h',
            sf: 'E',
            year: 2025,
            ...props
        }
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
                    lessons: [],
                    teachers: []
                },
                {
                    ...c25h,
                    lessons: [],
                    teachers: []
                }
            ])
        });
    });
});