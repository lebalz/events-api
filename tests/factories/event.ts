import { Prisma } from "@prisma/client";
import {faker} from '@faker-js/faker';

export const generateEvent = (props: (Partial<Prisma.EventUncheckedCreateInput> & {authorId: string})): Prisma.EventCreateInput => {
    const start = faker.date.future({years: 1});
    const end = faker.date.future({refDate: start, years: 1});
    const {authorId, parentId} = props;

    if (authorId) {
        delete (props as any).authorId;
    }
    if (parentId) {
        delete (props as any).parentId;
    }
	const event: Prisma.EventCreateInput = {
        start: start,
        end: end,
        description: faker.lorem.sentence(),
        descriptionLong: faker.lorem.paragraphs(3),
        location: faker.location.city(),
        ...props,
        author: {connect: { id: authorId }},
        parent: parentId ? {connect: { id: parentId }} : undefined
	};
    return event;
};

export const eventSequence = (authorId: string, count: number, props: Partial<Prisma.EventUncheckedCreateInput> = {}) => {
    return [...Array(count).keys()].map(i => generateEvent({...props, authorId: authorId}));
}