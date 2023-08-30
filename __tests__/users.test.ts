import { Prisma, Role, User } from "@prisma/client"
import _ from "lodash";
import { v4 as uuidv4 } from 'uuid';
import { prismaMock } from "../__mocks__/singleton";
import Users from "../src/models/users";
import prisma from "../src/prisma";
import { DefaultArgs } from "@prisma/client/runtime/library";
import { HTTP403Error, HTTP404Error } from "../src/errors/Errors";

export const getMockProps = (props: Partial<Prisma.UserUncheckedCreateInput>) => {
    const mail = props.email || 'foo@bar.ch';
    return {
        id: props.id || uuidv4(),
        email: props.email || mail,
        firstName: props.firstName || _.capitalize(mail.split('@')[0]),
        lastName: props.lastName || _.capitalize(mail.split('@')[1].split('.')[0]),
        role: props.role || Role.USER,
        createdAt: (props.createdAt || new Date()) as Date,
        updatedAt: (props.updatedAt || new Date()) as Date,
        icsLocator: props.icsLocator || null,
        untisId: props.untisId || null,
    };
}

const createMocks = (_users: User[]) => {
    const users = _users.map(e => ({ ...e }));
    const handleRelations = (event: User, include?: Prisma.UserInclude | null) => {
      const ret = { ...event }
      if (!include) {
        return ret
      };
      if (include.events) {
        (ret as any).events = [];
      }
      if (include.eventGroups) {
        (ret as any).eventGroups = [];
      }
      if (include.jobs) {
        (ret as any).jobs = [];
      }
      return ret;
    }
    /** mock update */
    prismaMock.user.update.mockImplementation(((args: Prisma.UserUpdateArgs) => {
      const idx = users.findIndex(e => e.id === args.where.id);
      Object.keys(args.data).forEach((key) => {
        (users[idx] as any)[key] = (args.data as any)[key];
      });
      return handleRelations(users[idx], args.include);
    }) as unknown as typeof prisma.user.update);
  
    /** mock find event */
    prismaMock.user.findUnique.mockImplementation(((args: Prisma.UserFindUniqueArgs) => {
        const user = users.find(u => u.id === args.where.id);
        if (user) {
          return handleRelations(user, args.include);
        }
        return null;
    }) as unknown as typeof prisma.user.findUnique);

    /** mock find event */
    prismaMock.user.findMany.mockImplementation(((args: Prisma.UserFindManyArgs) => {
        const ret = users.filter(u => {
            if (args.where?.id) {
                return u.id === args.where.id;
            }
            if (args.where?.role) {
                return u.role === args.where.role;
            }
            return true;
        });
        return ret.map(e => handleRelations(e, args.include));
    }) as unknown as typeof prisma.user.findMany);
  }
  

test('returns user', async () => {
    const user = getMockProps({ id: 'user-1' })
    createMocks([user]);

    await expect(Users.findUser('user-1')).resolves.toEqual({
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