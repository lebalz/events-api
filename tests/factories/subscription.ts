import { Prisma } from '@prisma/client';
import { faker } from '@faker-js/faker';
import { ApiSubscription } from '../../src/models/subscription.helpers';

export const generateSubscription = (
    props: Partial<ApiSubscription> & {
        userId: string;
    }
): Prisma.SubscriptionCreateInput => {
    const { userId, departmentIds, ignoredEventIds, untisClassIds } = props;

    // Remove nested properties from props if they are provided, avoiding collisions
    if (userId) {
        delete (props as any).userId;
    }
    if (departmentIds) {
        delete props.departmentIds;
    }
    if (ignoredEventIds) {
        delete props.ignoredEventIds;
    }
    if (untisClassIds) {
        delete props.untisClassIds;
    }

    return {
        user: { connect: { id: userId } },
        departments: departmentIds ? { connect: departmentIds.map((id) => ({ id })) } : undefined,
        ignoredEvents: ignoredEventIds ? { connect: ignoredEventIds.map((id) => ({ id })) } : undefined,
        untisClasses: untisClassIds ? { connect: untisClassIds.map((id) => ({ id })) } : undefined,
        icsLocator: faker.string.uuid(),
        ...(props as Partial<Prisma.SubscriptionCreateInput>)
    };
};

export const subscriptionSequence = (count: number, userId: string) => {
    return [...Array(count).keys()].map((i) => generateSubscription({ userId: userId }));
};
