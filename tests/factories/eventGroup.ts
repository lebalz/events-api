import { Prisma } from "@prisma/client";
import {faker} from '@faker-js/faker';

export const generateEventGroup = (_props: Partial<Prisma.EventGroupUncheckedCreateInput> & { userIds: string[], eventIds: string[]}): Prisma.EventGroupCreateInput => {
    const props = {..._props};
    const {userIds, eventIds} = props;
    delete (props as any).userIds;
    delete (props as any).eventIds;
	return {
        name: faker.commerce.department(),
        description: faker.commerce.productDescription(),
        ...props,
        users: {
            connect: userIds.map(id => ({id}))
        },
        events: {
            connect: eventIds.map(id => ({id}))
        }
	};
};