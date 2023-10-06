import { Prisma } from "@prisma/client";
import {faker} from '@faker-js/faker';

export const generateUserEventGroup = (_props: Partial<Prisma.UserEventGroupUncheckedCreateInput> & { userId: string}): Prisma.UserEventGroupCreateInput => {
    const props = {..._props};
    const {userId} = props;
    delete (props as any).userId;
	return {
        user: { connect: { id: userId } },
        name: faker.commerce.department(),
        description: faker.commerce.productDescription(),
        ...props
	};
};

export const userEventGroupSequence = (count: number, props: Partial<Prisma.UserEventGroupUncheckedCreateInput> & { userId: string}) => {
    return [...Array(count).keys()].map(i => {
        const ueGroup = generateUserEventGroup(props);
        const {user} = ueGroup;
        delete (ueGroup as any).user;
        return {
            ...ueGroup,
            userId: user.connect!.id!
        }
    });
}