import { JobType, Prisma, Role, User } from "@prisma/client";
import Semesters from "../../../src/models/semesters";
import prismock from "../__mocks__/prismockClient";
import { createUser } from "./users.test";
import { HTTP400Error, HTTP403Error, HTTP404Error } from "../../../src/utils/errors/Errors";
import { generateSemester } from "../../factories/semester";

export const createSemester = async (props: Partial<Prisma.SemesterUncheckedCreateInput>) => {
    return await prismock.semester.create({
        data: generateSemester(props)
    });
}

describe('Semester', () => {
    describe('all', () => {
        test('find all semesters', async () => {
            const semester1 = await createSemester({});
            const semester2 = await createSemester({});
            await expect(Semesters.all()).resolves.toEqual([semester1, semester2]);
        });
    });
    describe('find semester', () => {
        test('find semester', async () => {
            const semester = await createSemester({});
            await expect(Semesters.findModel(semester.id)).resolves.toEqual({
                ...semester
            });
        });
        test('throws on not existing record', async () => {
            await expect(Semesters.findModel('i-dont-exist!')).rejects.toEqual(
                new HTTP404Error('Semester with id i-dont-exist! not found')
            );
        });
    });
    describe('create semester', () => {
        test('user can not create a semester', async () => {
            const user = await createUser({ firstName: 'Reto' });
            await expect(Semesters.createModel(user, {
                name: 'HS',
                end: new Date(),
                start: new Date()
            })).rejects.toEqual(
                new HTTP403Error('Not authorized')
            );
        });
        test('admin can create a semester', async () => {
            const admin = await createUser({ role: Role.ADMIN });
            const start = new Date(2023, 8, 4);
            const end = new Date(2023, 8, 12);
            await expect(Semesters.createModel(admin, {
                name: 'HS',
                start: start,
                end: end
            })).resolves.toEqual({
                id: expect.any(String),
                name: 'HS',
                start: start,
                end: end,
                untisSyncDate: new Date(2023, 8, 8),
                createdAt: expect.any(Date),
                updatedAt: expect.any(Date),
            });
        });
        test('can not create semester with end < start', async () => {
            const admin = await createUser({ role: Role.ADMIN });
            await expect(Semesters.createModel(admin, {
                name: 'HS',
                start: new Date(2023, 8, 4),
                end: new Date(2023, 8, 3)
            })).rejects.toEqual(
                new HTTP400Error('End date must be after start date')
            );
        }
        );
    });
    describe('update semester', () => {
        test('user can not update semester', async () => {
            const user = await createUser({ firstName: 'Reto' });
            const semester = await createSemester({});
            await expect(Semesters.updateModel(user, semester.id, { name: 'HS 2023' })).rejects.toEqual(
                new HTTP403Error('Not authorized')
            );
        });
        test('admin can update semester', async () => {
            const admin = await createUser({ role: Role.ADMIN });
            const semester = await createSemester({start: new Date(2021, 8, 4), end: new Date(2021, 11, 4)});
            const start = new Date(2023, 8, 4);
            const end = new Date(2023, 11, 4);
            const syncDate = new Date(2023, 10, 4);
            await expect(Semesters.updateModel(admin, semester.id, { name: 'HS 2024', start, end, untisSyncDate: syncDate })).resolves.toEqual({
                ...semester,
                name: 'HS 2024',
                start,
                end,
                untisSyncDate: syncDate
            });
        });
        test('can not set end < start or start > end', async () => {
            const admin = await createUser({ role: Role.ADMIN });
            const semester = await createSemester({start: new Date(2023, 8, 4), end: new Date(2023, 11, 4)});
            await expect(Semesters.updateModel(admin, semester.id, { start: new Date(2023, 11, 5) })).rejects.toEqual(
                new HTTP400Error('End date must be after start date')
            );
            await expect(Semesters.updateModel(admin, semester.id, { end: new Date(2023, 8, 3) })).rejects.toEqual(
                new HTTP400Error('End date must be after start date')
            );
        });
        test('can not set syncdate outside of semester', async () => {
            const admin = await createUser({ role: Role.ADMIN });
            const semester = await createSemester({start: new Date(2023, 7, 14), end: new Date(2023, 11, 4)});
            await expect(Semesters.updateModel(admin, semester.id, { untisSyncDate: new Date(2023, 7, 13) })).rejects.toEqual(
                new HTTP400Error('Sync date must be between start and end date')
            );
            await expect(Semesters.updateModel(admin, semester.id, { untisSyncDate: new Date(2023, 11, 5) })).rejects.toEqual(
                new HTTP400Error('Sync date must be between start and end date')
            );
        });
    });
    describe('delete semester', () => {
        test('user can not delete semester', async () => {
            const user = await createUser({ firstName: 'Reto' });
            const semester = await createSemester({});
            await expect(Semesters.destroy(user, semester.id)).rejects.toEqual(
                new HTTP403Error('Not authorized')
            );
        });
        test('admin can delete semester', async () => {
            const admin = await createUser({ role: Role.ADMIN });
            const semester = await createSemester({});
            await expect(Semesters.destroy(admin, semester.id)).resolves.toEqual({
                ...semester
            });
            await expect(Semesters.findModel(semester.id)).rejects.toEqual(
                new HTTP404Error(`Semester with id ${semester.id} not found`)
            );
        });
        test('delete semester removes lessons too', async () => {
            const admin = await createUser({ role: Role.ADMIN });
            const klass = await prismock.untisClass.create({data: {name: '25h', sf: 'E', year: 2025}});
            const semester = await createSemester({});
            const lesson = await prismock.untisLesson.create({
                data: {
                    description: 'Math', 
                    endHHMM: 1005,
                    startHHMM: 920,
                    subject: 'M',
                    room: 'D202',
                    semesterNr: 1,
                    weekDay: 2,
                    year: 2023,
                    semesterId: semester.id,
                    classes: {connect: {id: klass.id}}
                }
            });
            await expect(Semesters.destroy(admin, semester.id)).resolves.toEqual({
                ...semester
            });
            await expect(Semesters.findModel(semester.id)).rejects.toEqual(
                new HTTP404Error(`Semester with id ${semester.id} not found`)
            );
            await expect(prismock.untisLesson.findUnique({where: {id: lesson.id}})).resolves.toEqual(null);
            await expect(prismock.untisClass.findUnique({where: {id: klass.id}})).resolves.toEqual(klass);
        });
    });
});