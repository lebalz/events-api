import { JobType, Prisma, Role, User } from "@prisma/client";
import Semesters from "../../../src/models/semesters";
import prismock from "../__mocks__/prismockClient";
import { createUser } from "./users.test";
import { HTTP400Error, HTTP403Error, HTTP404Error } from "../../../src/utils/errors/Errors";
import { PrismockClientType } from "prismock/build/main/lib/client";

export const createUntisTeacher = async (props: Partial<Prisma.UntisClassUncheckedCreateInput>) => {
    return await prismock.untisTeacher.create({
        data: {
            active: true,
            name: 'fba',
            longName: 'Foo Bar',
            title: 'M'
        }
    });
}

describe('UntisTeacher', () => {
    describe('all', () => {
        test('returns all untisClasses', async () => {
            createUntisTeacher({ name: '25h' });
            createUntisTeacher({ name: '24i' });
            
            
        });
    });
});