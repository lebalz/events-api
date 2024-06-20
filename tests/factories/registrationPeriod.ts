import { Prisma } from '@prisma/client';
import { faker } from '@faker-js/faker';

export type RPCreate = Partial<Prisma.RegistrationPeriodUncheckedCreateInput> & {
    departmentIds?: string[];
};

export const generateRegistrationPeriod = (props: RPCreate = {}): Prisma.RegistrationPeriodCreateInput => {
    const { departmentIds } = props;
    if (departmentIds) {
        delete props.departmentIds;
    }
    const eventStart = props.eventRangeStart
        ? props.eventRangeStart
        : faker.date.recent({ refDate: props.eventRangeEnd || new Date() });
    const eventEnd = props.eventRangeEnd ? props.eventRangeEnd : faker.date.future({ refDate: eventStart });
    return {
        name: faker.animal.bird(),
        start: faker.date.recent(),
        end: faker.date.future(),
        eventRangeStart: eventStart,
        eventRangeEnd: eventEnd,
        description: faker.lorem.sentences(2),
        departments:
            props.departments ??
            (departmentIds ? { connect: departmentIds.map((did) => ({ id: did })) } : undefined),
        ...props
    };
};
