import { Prisma } from '@prisma/client';
import { faker } from '@faker-js/faker';

export const generateEvent = (
    props: Partial<Prisma.EventUncheckedCreateInput> & {
        authorId: string;
        between?: { from: Date; to: Date };
        departmentIds?: string[];
    }
): Prisma.EventCreateInput => {
    const start = props.start
        ? new Date(props.start)
        : props.between
          ? faker.date.between(props.between)
          : faker.date.between({ from: new Date(), to: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7 * 12) });
    const end = props.end
        ? new Date(props.end)
        : props.between
          ? faker.date.between({ from: start, to: props.between.to })
          : faker.date.between({ from: start, to: new Date(start.getTime() + 1000 * 60 * 60 * 24 * 7 * 12) });
    const { authorId, parentId, jobId, departmentIds, clonedFromId } = props;

    if (authorId) {
        delete (props as any).authorId;
    }
    if (parentId) {
        delete (props as any).parentId;
    }
    if (clonedFromId) {
        delete (props as any).clonedFromId;
    }
    if (props.between) {
        delete (props as any).between;
    }
    if (props.jobId) {
        delete (props as any).jobId;
    }
    if (props.departmentIds) {
        delete (props as any).departmentIds;
    }
    const event: Prisma.EventCreateInput = {
        start: start,
        end: end,
        description: faker.lorem.sentence(),
        descriptionLong: faker.lorem.paragraphs(3),
        location: faker.location.city(),
        ...props,
        author: { connect: { id: authorId } },
        departments:
            props.departments ??
            (departmentIds ? { connect: departmentIds.map((did) => ({ id: did })) } : undefined),
        parent: parentId ? { connect: { id: parentId } } : undefined,
        clonedFrom: clonedFromId ? { connect: { id: clonedFromId } } : undefined,
        job: jobId ? { connect: { id: jobId } } : undefined
    };
    if (event.updatedAt && event.clonedFrom) {
        throw new Error("updatedAt and clonedFrom can't be used together");
    }
    return event;
};

export const eventSequence = (
    authorId: string,
    count: number,
    props: Partial<Prisma.EventUncheckedCreateInput> & { between?: { from: Date; to: Date } } = {}
) => {
    return [...Array(count).keys()].map((i) => generateEvent({ ...props, authorId: authorId }));
};
export const eventSequenceUnchecked = (
    count: number,
    props: Partial<Prisma.EventUncheckedCreateInput> & { authorId: string }
) => {
    return [...Array(count).keys()].map((i) => {
        const event = generateEvent({ ...props });
        const { author, parent, clonedFrom } = event;
        delete (event as any).author;
        delete (event as any).parent;
        delete (event as any).clonedFrom;

        return {
            ...event,
            authorId: author.connect!.id!,
            parentId: parent?.connect?.id,
            clonedFromId: clonedFrom?.connect?.id
        };
    });
};
