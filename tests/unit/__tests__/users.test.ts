import { Prisma, Role } from '@prisma/client';
import _ from 'lodash';
import Users from '../../../src/models/users';
import { HTTP403Error, HTTP404Error } from '../../../src/utils/errors/Errors';
import prisma from '../../../src/prisma';
import { generateUser } from '../../factories/user';

export const createUser = async (props: Partial<Prisma.UserUncheckedCreateInput>) => {
    return await prisma.user.create({
        data: generateUser(props)
    });
};

test('returns user', async () => {
    const user = await createUser({ id: '14d670d1-44fd-48d3-bb3d-02ea21c36019' });

    await expect(Users.findModel('14d670d1-44fd-48d3-bb3d-02ea21c36019')).resolves.toEqual({
        ...user
    });
});

test('returns users', async () => {
    const user1 = await createUser({ id: 'bfc23480-9bb9-4dc1-aa8a-d4a108bd49f6' });
    const user2 = await createUser({ id: '14d670d1-44fd-48d3-bb3d-02ea21c36019' });
    const result = await Users.all();
    expect(_.orderBy(result, ['id'])).toEqual(_.orderBy([user1, user2], 'id'));
});

describe('linkToUntis', () => {
    test('user can link self to untisId', async () => {
        const user = await createUser({ id: '37b72318-8daa-4f90-9d8e-46bc6bc03b3b' });
        const untis = await prisma.untisTeacher.create({
            data: { id: 42, active: true, longName: '', name: 'infinity', title: '' }
        });
        await expect(Users.linkToUntis(user, user.id, 42)).resolves.toEqual({
            ...user,
            untisId: 42,
            updatedAt: expect.any(Date)
        });
    });

    test('user can not update another users untisId', async () => {
        const reto = await createUser({ id: 'c17b27de-d815-46cf-93ba-0e016d18ec6e' });
        const maria = await createUser({ id: '37b72318-8daa-4f90-9d8e-46bc6bc03b3b' });
        await expect(Users.linkToUntis(reto, maria.id, 42)).rejects.toEqual(
            new HTTP403Error('Not authorized')
        );
    });
});

describe('setRole', () => {
    test('admin can give admin roles', async () => {
        const admin = await createUser({ id: '9bb4cfe2-623d-4004-8e4f-1728e5029876', role: Role.ADMIN });
        const user = await createUser({ id: 'f30fd8f1-ed9e-44f3-bf3d-c5c385de15cd' });
        await expect(Users.setRole(admin, user.id, Role.ADMIN)).resolves.toEqual({
            ...user,
            role: Role.ADMIN,
            updatedAt: expect.any(Date)
        });
    });
    test('admin can revoke admin roles', async () => {
        const admin = await createUser({ id: '9bb4cfe2-623d-4004-8e4f-1728e5029876', role: Role.ADMIN });
        const user = await createUser({ id: 'f30fd8f1-ed9e-44f3-bf3d-c5c385de15cd', role: Role.ADMIN });
        await expect(Users.setRole(admin, user.id, Role.USER)).resolves.toEqual({
            ...user,
            role: Role.USER,
            updatedAt: expect.any(Date)
        });
    });
    test('user can not give admin roles', async () => {
        const malory = await createUser({ id: 'ffeeb94d-6cab-4ea3-bcb1-c0f803240cb8' });
        const maria = await createUser({ id: '37b72318-8daa-4f90-9d8e-46bc6bc03b3b' });
        await expect(Users.setRole(malory, maria.id, Role.ADMIN)).rejects.toEqual(
            new HTTP403Error('Not authorized')
        );
    });
});

describe('createIcs', () => {
    test('user can not create others ics calendar files', async () => {
        const maria = await createUser({ id: '37b72318-8daa-4f90-9d8e-46bc6bc03b3b' });
        const reto = await createUser({ id: 'c17b27de-d815-46cf-93ba-0e016d18ec6e' });
        await expect(Users.createIcs(maria, reto.id)).rejects.toEqual(new HTTP403Error('Not authorized'));
    });
});

describe('affectedEvents', () => {
    test('user can not get affected events of another user', async () => {
        const maria = await createUser({ id: '37b72318-8daa-4f90-9d8e-46bc6bc03b3b' });
        const reto = await createUser({ id: 'c17b27de-d815-46cf-93ba-0e016d18ec6e' });
        await expect(Users.affectedEvents(maria, reto.id)).rejects.toEqual(
            new HTTP403Error('Not authorized')
        );
    });
    test('admin can not get affected events of unknown user', async () => {
        const maria = await createUser({ id: '37b72318-8daa-4f90-9d8e-46bc6bc03b3b', role: Role.ADMIN });
        await expect(Users.affectedEvents(maria, 'cc28810e-4b91-41f0-b6ab-20ac71cd2152')).rejects.toEqual(
            new HTTP404Error('User not found')
        );
    });
});
