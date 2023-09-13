import { Prisma } from "@prisma/client";
import {faker} from '@faker-js/faker';

export const generateEvent = (props: (Partial<Prisma.EventUncheckedCreateInput> & {authorId: string})): Prisma.EventCreateInput => {
    const start = faker.date.future({years: 1});
    const end = faker.date.future({refDate: start, years: 1});
	return {
        start: start,
        end: end,
        description: faker.lorem.sentence(),
        descriptionLong: faker.lorem.paragraphs(3),
        location: faker.location.city(),
        ...props,
        author: { connect: { id: props.authorId } },
	};
};

export const eventSequence = (authorId: string, count: number) => {
    return [...Array(count).keys()].map(i => generateEvent({authorId: authorId}));
}