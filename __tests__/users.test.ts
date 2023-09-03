import { Role } from "@prisma/client"
import _ from "lodash";
import Users from "../src/models/users";
import { HTTP403Error, HTTP404Error } from "../src/utils/errors/Errors";
import { createMocks, getMockProps } from "../__mocks__/users.mocks";


test('returns user', async () => {
    const user = getMockProps({ id: 'user-1' })
    createMocks([user]);

    await expect(Users.findModel('user-1')).resolves.toEqual({
        ...user
    });
})

test('returns users', async () => {
    const user1 = getMockProps({ id: 'user-1' })
    const user2 = getMockProps({ id: 'user-2' })
    createMocks([user1, user2]);
    await expect(Users.all()).resolves.toEqual([user1, user2]);
})

describe('linkToUntis', () => {
    test('user can link self to untisId', async () => {
        const user = getMockProps({ id: 'reto' });
        createMocks([user]);
        await expect(Users.linkToUntis(user, user.id, 42)).resolves.toEqual({...user, untisId: 42});
    });
    
    
    test('user can not update another users untisId', async () => {
        const reto = getMockProps({ id: 'reto' })
        const maria = getMockProps({ id: 'maria' })
        createMocks([reto]);
        await expect(Users.linkToUntis(reto, maria.id, 42)).rejects.toEqual(new HTTP403Error('Not authorized'));
    });
});

describe('setRole', () => {
    test('admin can give admin roles', async () => {
        const admin = getMockProps({ id: 'admin', role: Role.ADMIN });
        const user = getMockProps({ id: 'user' });
        createMocks([user, admin]);
        await expect(Users.setRole(admin, user.id, Role.ADMIN)).resolves.toEqual({...user, role: Role.ADMIN});
    });
    test('admin can revoke admin roles', async () => {
        const admin = getMockProps({ id: 'admin', role: Role.ADMIN });
        const user = getMockProps({ id: 'user', role: Role.ADMIN });
        createMocks([user, admin]);
        await expect(Users.setRole(admin, user.id, Role.USER)).resolves.toEqual({...user, role: Role.USER});
    });
    test('user can not give admin roles', async () => {
        const malory = getMockProps({ id: 'reto' })
        const maria = getMockProps({ id: 'maria' })
        createMocks([malory, maria]);
        await expect(Users.setRole(malory, maria.id, Role.ADMIN)).rejects.toEqual(new HTTP403Error('Not authorized'));
    });
});


describe('createIcs', () => {
    test('user can not create others ics calendar files', async () => {
        const maria = getMockProps({ id: 'maria' })
        const reto = getMockProps({ id: 'reto' })
        createMocks([maria, reto]);
        await expect(Users.createIcs(maria, reto.id)).rejects.toEqual(new HTTP403Error('Not authorized'));
    });
});

describe('affectedEvents', () => {
    test('user can not get affected events of another user', async () => {
        const maria = getMockProps({ id: 'maria' })
        const reto = getMockProps({ id: 'reto' })
        createMocks([maria, reto]);
        await expect(Users.affectedEvents(maria, reto.id)).rejects.toEqual(new HTTP403Error('Not authorized'));
    });
    test('admin can not get affected events of unknown user', async () => {
        const maria = getMockProps({ id: 'maria', role: Role.ADMIN })
        createMocks([maria]);
        await expect(Users.affectedEvents(maria, 'unknown')).rejects.toEqual(new HTTP404Error('User not found'));
    });
});