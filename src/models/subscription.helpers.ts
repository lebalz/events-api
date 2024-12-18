import { Subscription } from '@prisma/client';

export interface ApiSubscription extends Subscription {
    ignoredEventIds: string[];
    departmentIds: string[];
    untisClassIds: number[];
}

export interface PrepareableSubscription extends Subscription {
    ignoredEvents: { id: string }[];
    departments: { id: string }[];
    untisClasses: { id: number }[];
}

export const DEFAULT_INCLUDE = {
    departments: { select: { id: true } },
    ignoredEvents: { select: { id: true } },
    untisClasses: { select: { id: true } }
} as const;

export const prepareSubscription = (subscription: PrepareableSubscription): ApiSubscription => {
    const prepared: ApiSubscription = {
        ...subscription,
        departmentIds: subscription.departments.map((d) => d.id) || [],
        ignoredEventIds: subscription.ignoredEvents.map((e) => e.id) || [],
        untisClassIds: subscription.untisClasses.map((c) => c.id) || []
    };
    ['departments', 'ignoredEvents', 'untisClasses'].forEach((key) => {
        delete (prepared as any)[key];
    });
    return prepared;
};
