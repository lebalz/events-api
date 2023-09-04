import { Prisma } from "@prisma/client";
import { v4 as uuidv4 } from 'uuid';
// import { createDepartment } from "../__mocks__/factories/department.factory";
import Departments from "../src/models/departments";
import prismock from "../__mocks__/prismockClient";

export const createDepartment = async (props: Partial<Prisma.DepartmentUncheckedCreateInput>) => {
    return await prismock.department.create({ 
        data: {
            name: '', 
            ...props
        }
    });
}

describe('Department model', () => {
    test('find department', async () => {
        const department = await prismock.department.create({ data: {name: 'test'}});
        await expect(Departments.findModel(department.id)).resolves.toEqual(department);
    });
    test('find all', async () => {
        await expect(Departments.all()).resolves.toHaveLength(0);
        const department1 = await prismock.department.create({ data: {name: 'd1'}});
        const department2 = await prismock.department.create({ data: {name: 'd2'}});
        await expect(Departments.all()).resolves.toHaveLength(2);
    });
});