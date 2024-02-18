import { Prisma } from "@prisma/client";
import {faker} from '@faker-js/faker';
import { generateUser } from "./user";

export const generateEventGroup = (_props: Partial<Prisma.EventGroupUncheckedCreateInput> & { userId: string}): Prisma.EventGroupCreateInput => {
    const props = {..._props};
    const {userId} = props;
    delete (props as any).userId;
	return {
        name: faker.commerce.department(),
        description: faker.commerce.productDescription(),
        ...props,
        users: {
            connect: {
                id: userId
            }
        }
	};
};