import { Prisma, Role } from "@prisma/client"
import _ from "lodash";
import { v4 as uuidv4 } from 'uuid';
import { prismaMock } from "../src/singleton";
import { default as Users } from "../src/models/users";
import prisma from "../src/prisma";
import { DefaultArgs } from "@prisma/client/runtime/library";

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


test('returns user', async () => {
    const user = getMockProps({ id: 'user-1' })

    prismaMock.user.findUnique.mockImplementation(((args: {where: {id: string}}) => {
        if (args.where.id === user.id) {
            return user;
        }
        return null;
    }) as unknown as typeof prisma.user.findUnique);


    await expect(Users.find('user-1')).resolves.toEqual({
        ...user
    });
})

test('returns users', async () => {
    const user1 = getMockProps({ id: 'user-1' })
    const user2 = getMockProps({ id: 'user-2' })

    prismaMock.user.findMany.mockResolvedValue([user1, user2]);

    await expect(Users.all()).resolves.toEqual([user1, user2]);
})

test('user can link self to untisId', async () => {
    const user = getMockProps({ id: 'reto' })
    prismaMock.user.update.mockImplementation(((args: {data: Prisma.UserUncheckedCreateInput}) => {
        return {...user, ...args.data};
    }) as unknown as typeof prisma.user.update);

    await expect(Users.linkToUntis(user, user.id, 42)).resolves.toEqual({...user, untisId: 42});
});


test('user can not update another users untisId', async () => {
    const user = getMockProps({ id: 'reto' })

    prismaMock.user.update.mockImplementation();

    await expect(Users.linkToUntis(user, 'maria', 42)).rejects.toEqual(new Error('Not authorized'));
})