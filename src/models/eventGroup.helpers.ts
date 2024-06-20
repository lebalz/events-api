import { EventGroup } from '@prisma/client';
export interface ApiEventGroup extends Omit<EventGroup, 'events' | 'users'> {
    eventIds: string[];
    userIds: string[];
}

export const prepareEventGroup = (
    eventGroup: EventGroup & { events: { id: string }[]; users: { id: string }[] }
): ApiEventGroup => {
    const prepared: ApiEventGroup = {
        ...eventGroup,
        eventIds: eventGroup.events.map((e) => e.id).sort(),
        userIds: eventGroup.users.map((u) => u.id).sort()
    };
    ['events', 'users'].forEach((key) => {
        delete (prepared as any)[key];
    });
    return prepared;
};
