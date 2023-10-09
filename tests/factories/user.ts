import { Prisma } from "@prisma/client";
import {faker} from '@faker-js/faker';

export const generateUser = (props: Partial<Prisma.UserUncheckedCreateInput> = {}): Prisma.UserCreateInput => {
    const {untisId} = props;
    if (untisId) {
        delete props.untisId;
    }
	return {
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        email: faker.internet.email(),
        untis: untisId ? {connect: {id: untisId}} : undefined,
        ...props
	};
};

export const userSequence = (count: number) => {
    return [...Array(count).keys()].map(i => generateUser());
}