import { Prisma, Role, User } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { prismaMock } from './singleton';
import prisma from '../src/prisma';
import _ from 'lodash';

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

export const createMocks = (_users: User[]) => {
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

    /** mock findMany event */
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
  