import { Prisma, Role } from "@prisma/client";
import Departments from "../src/models/departments";
import prismock from "../__mocks__/prismockClient";
import { createUser } from "./users.test";
import { HTTP400Error, HTTP403Error } from "../src/utils/errors/Errors";

export const createDepartment = async (props: Partial<Prisma.DepartmentUncheckedCreateInput>) => {
    return await prismock.department.create({ 
        data: {
            name: '', 
            ...props
        }
    });
}

describe('Departments', () => {
    test('find department', async () => {
        const department = await prismock.department.create({ data: {name: 'test'}});
        await expect(Departments.findModel(department.id)).resolves.toEqual(department);
    });
    test('find all', async () => {
        await expect(Departments.all()).resolves.toHaveLength(0);
        const department1 = await prismock.department.create({ data: {name: 'd1'}});
        const department2 = await prismock.department.create({ data: {name: 'd2'}});
        await expect(Departments.all()).resolves.toHaveLength(2);
        await expect(Departments.all()).resolves.toEqual([department1, department2]);
    });
    describe('update department', () => {
        test('user can not update department', async () => {
            const user = await createUser({});
            const department = await createDepartment({});
            await expect(Departments.updateModel(user, department.id, {name: 'new name'})).rejects.toEqual(
                new HTTP403Error('Not authorized')
            );
        });
        test('admin can update department', async () => {
            const admin = await createUser({role: Role.ADMIN});
            const department = await createDepartment({});
            await expect(Departments.updateModel(admin, department.id, {name: 'new name', classLetters: ['B', 'A']})).resolves.toEqual({
                ...department,
                name: 'new name',
                classLetters: ['B', 'A']
            });
        });

        test('detects invalid letter combinations', async () => {
            const admin = await createUser({role: Role.ADMIN});
            const depAB = await createDepartment({name: 'depAB-', classLetters: ['A', 'B']});
            const depCD = await createDepartment({name: 'depCD-', classLetters: ['C', 'D']});
            await expect(Departments.updateModel(admin, depCD.id, {classLetters: ['B', 'C', 'D']})).rejects.toEqual(
                new HTTP400Error('Unique Letters Constraint Error: invalid combinations: depCD-B')
            );
        });
    });
    describe('create department', () => {
        test('user can not create department', async () => {
            const user = await createUser({});
            await expect(Departments.createModel(user, {name: 'new name'})).rejects.toEqual(
                new HTTP403Error('Not authorized')
            );
        });
        test('admin can update department', async () => {
            const admin = await createUser({role: Role.ADMIN});
            await expect(Departments.createModel(admin, {name: 'new name'})).resolves.toEqual({
                id: expect.any(String),
                color: '#306cce',
                description: '',
                name: 'new name',
                letter: '',
                updatedAt: expect.any(Date),
                createdAt: expect.any(Date)
            });
        });
    });

    describe('destroy department', () => {
        test('user can not destroy', async () => {
            const user = await createUser({});
            const department = await createDepartment({});
            await expect(Departments.destroy(user, department.id)).rejects.toEqual(
                new HTTP403Error('Not authorized')
            );
        });
        test('admin can destroy unassigned department', async () => {
            const admin = await createUser({role: Role.ADMIN});
            const department = await createDepartment({});
            await expect(Departments.destroy(admin, department.id)).resolves.toEqual({
                ...department
            });
        });
        test('admin can not destroy assigned department', async () => {
            const admin = await createUser({role: Role.ADMIN});
            const department = await createDepartment({ classes: { create: { name: '25h', sf: 'E', year: 2025 } }});
            await expect(Departments.destroy(admin, department.id)).rejects.toEqual(
                new HTTP400Error('Cannot delete department with classes or events')
            );
        });
    });
});