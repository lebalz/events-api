import { Prisma } from "@prisma/client";
import {faker} from '@faker-js/faker';

export const generateEvent = (props: (Partial<Prisma.EventUncheckedCreateInput> & {authorId: string, between?: {from: Date, to: Date}})): Prisma.EventCreateInput => {
    const start = props.between ? faker.date.between(props.between) : faker.date.future({years: 1});
    const end = props.between ? faker.date.between({from: start, to: props.between.to}) : faker.date.future({refDate: start, years: 1});
    const {authorId, parentId, jobId} = props;

    if (authorId) {
        delete (props as any).authorId;
    }
    if (parentId) {
        delete (props as any).parentId;
    }
    if (props.between) {
        delete (props as any).between;
    }
    if (props.jobId) {
        delete (props as any).jobId;
    }
	const event: Prisma.EventCreateInput = {
        start: start,
        end: end,
        description: faker.lorem.sentence(),
        descriptionLong: faker.lorem.paragraphs(3),
        location: faker.location.city(),
        ...props,
        author: {connect: { id: authorId }},
        parent: parentId ? {connect: { id: parentId }} : undefined,
        job: jobId ? {connect: { id: jobId }} : undefined
	};
    return event;
};

export const eventSequence = (authorId: string, count: number, props: Partial<Prisma.EventUncheckedCreateInput> = {}) => {
    return [...Array(count).keys()].map(i => generateEvent({...props, authorId: authorId}));
}
export const eventSequenceUnchecked = (count: number, props: Partial<Prisma.EventUncheckedCreateInput> & {authorId: string}) => {
    return [...Array(count).keys()].map(i => {
        const event = generateEvent({...props});
        const {author, parent} = event;
        delete (event as any).author;
        delete (event as any).parent;
        return {
            ...event,
            authorId: author.connect!.id!,
            parentId: parent?.connect?.id
        }
    });
}
