import { EventState, Prisma, Role } from '@prisma/client';
import { createDepartment } from './departments.test';
import Events from '../../../src/models/event';
import { normalizeAudience, prepareEvent } from '../../../src/models/event.helpers';
import { HTTP400Error, HTTP403Error, HTTP404Error } from '../../../src/utils/errors/Errors';
import prisma from '../../../src/prisma';
import { createUser } from './users.test';
import { generateEvent } from '../../factories/event';
import { setTimeout } from 'timers/promises';
import _ from 'lodash';
import { createEventGroup } from './eventGroups.test';
import EventGroups from '../../../src/models/eventGroup';
import { createRegistrationPeriod } from './registrationPeriods.test';
import { faker } from '@faker-js/faker';
import { createSemester } from './semesters.test';

export const createEvent = async (
    props: Partial<Prisma.EventUncheckedCreateInput> & {
        authorId: string;
        departmentIds?: string[];
        userIds?: string[];
    }
) => {
    return await prisma.event.create({
        data: generateEvent(props),
        include: {
            linkedUsers: { select: { id: true } },
            departments: { select: { id: true } },
            children: { select: { id: true, state: true, createdAt: true } }
        }
    });
};

describe('find event', () => {
    test('returns event', async () => {
        const user = await createUser({});
        const event = await createEvent({ authorId: user.id });

        await expect(Events.findModel(user, event.id)).resolves.toEqual({
            /** expect the prepared event to be returned
             * @see event.helpers.ts#prepareEvent
             */
            ...prepareEvent(event),
            author: undefined,
            departments: undefined,
            departmentIds: [],
            job: undefined,
            children: undefined,
            publishedVersionIds: []
        });
    });
    test('admin can get review event', async () => {
        const user = await createUser({});
        const admin = await createUser({ role: Role.ADMIN });
        const event = await createEvent({ authorId: user.id, state: EventState.REVIEW });
        await expect(Events.findModel(admin, event.id)).resolves.toEqual(prepareEvent(event));
    });
    test('admin can get refused event', async () => {
        const user = await createUser({});
        const admin = await createUser({ role: Role.ADMIN });
        const event = await createEvent({ authorId: user.id, state: EventState.REFUSED });

        await expect(Events.findModel(admin, event.id)).resolves.toEqual(prepareEvent(event));
    });
    test('admin can not get draft event', async () => {
        const user = await createUser({});
        const admin = await createUser({ role: Role.ADMIN });
        const event = await createEvent({ authorId: user.id, state: EventState.DRAFT });

        await expect(Events.findModel(admin, event.id)).rejects.toEqual(new HTTP403Error('Not authorized'));
    });
    test('throws 404 if event not found', async () => {
        const user = await createUser({});
        await expect(Events.findModel(user, '7cf72375-4ee7-4a13-afeb-8d68883acdf4')).rejects.toEqual(
            new HTTP404Error('Event not found')
        );
    });
});

describe('updateEvent', () => {
    test('update DRAFT', async () => {
        const user = await createUser({});
        const event = await createEvent({ authorId: user.id, state: EventState.DRAFT });

        await expect(
            Events.updateModel(user, event.id, { description: 'hello', linkedUserIds: [user.id] })
        ).resolves.toEqual(
            prepareEvent({
                ...event,
                linkedUsers: [{ id: user.id }],
                description: 'hello',
                updatedAt: expect.any(Date)
            })
        );
    });
    // test('update a DRAFT from a group', async () => {
    // 	const alice = await createUser({})
    // 	const bob = await createUser({})
    // 	const group = await createEventGroup({ authorId: alice.id });
    // 	const event = await createEvent({authorId: alice.id, state: EventState.DRAFT })

    // 	await expect(Events.updateModel(alice, event.id, { description: 'hello' })).resolves.toEqual(prepareEvent({
    // 		...event,
    // 		description: 'hello',
    // 		updatedAt: expect.any(Date)
    // 	}));
    // });
    test('can add departments to a draft', async () => {
        const user = await createUser({});
        const dep1 = await createDepartment({});
        const event = await createEvent({
            authorId: user.id,
            state: EventState.DRAFT,
            departments: {
                connect: []
            }
        });
        expect(prepareEvent(event).departmentIds).toEqual([]);

        await expect(
            Events.updateModel(user, event.id, { description: 'hello', departmentIds: [dep1.id] })
        ).resolves.toEqual(
            prepareEvent({
                ...event,
                description: 'hello',
                departments: [dep1],
                updatedAt: expect.any(Date)
            })
        );
    });
    test('can not update not existant event', async () => {
        const user = await createUser({});

        await expect(Events.updateModel(user, '7cf72375-4ee7-4a13-afeb-8d68883acdf4', {})).rejects.toEqual(
            new HTTP404Error('Event not found')
        );
    });
    test('can not update another users events', async () => {
        const user = await createUser({});
        const malory = await createUser({});
        const event = await createEvent({ authorId: user.id, state: EventState.DRAFT });

        await expect(Events.updateModel(malory, event.id, { description: 'hello' })).rejects.toEqual(
            new HTTP403Error('Not authorized')
        );
    });

    test('update PUBLISHED creates a version', async () => {
        const user = await createUser({});
        const event = await createEvent({
            authorId: user.id,
            state: EventState.PUBLISHED,
            description: 'published'
        });

        await expect(
            Events.updateModel(user, event.id, { description: 'hello', linkedUserIds: [user.id] })
        ).resolves.toEqual(
            prepareEvent({
                ...event,
                linkedUsers: [{ id: user.id }],
                id: expect.any(String),
                state: EventState.DRAFT,
                createdAt: expect.any(Date),
                updatedAt: expect.any(Date),
                parentId: event.id,
                clonedFromId: event.id,
                description: 'hello'
            })
        );
    });

    test('update anothers PUBLISHED creates a version', async () => {
        const user = await createUser({});
        const other = await createUser({});
        const event = await createEvent({
            authorId: user.id,
            state: EventState.PUBLISHED,
            description: 'published'
        });

        await expect(
            Events.updateModel(other, event.id, { description: 'hello', linkedUserIds: [user.id] })
        ).resolves.toEqual(
            prepareEvent({
                ...event,
                linkedUsers: [{ id: user.id }],
                authorId: other.id,
                id: expect.any(String),
                state: EventState.DRAFT,
                createdAt: expect.any(Date),
                updatedAt: expect.any(Date),
                parentId: event.id,
                clonedFromId: event.id,
                description: 'hello'
            })
        );
    });

    test('update PUBLISHED with departments creates a version', async () => {
        const user = await createUser({ id: '3535b2ee-806f-425c-a4f5-394d8b16f6f9' });
        const department = await createDepartment({ id: 'ed588f55-0e3b-425c-8adf-87cb15b80ac2' });
        const event = await createEvent({
            id: '7cf72375-4ee7-4a13-afeb-8d68883acdf4',
            authorId: user.id,
            state: EventState.PUBLISHED,
            description: 'published',
            departments: { connect: { id: department.id } }
        });

        await expect(
            Events.updateModel(user, '7cf72375-4ee7-4a13-afeb-8d68883acdf4', {
                description: 'hello',
                departmentIds: [department.id]
            })
        ).resolves.toEqual(
            prepareEvent({
                ...event,
                id: expect.any(String),
                state: EventState.DRAFT,
                createdAt: expect.any(Date),
                updatedAt: expect.any(Date),
                parentId: '7cf72375-4ee7-4a13-afeb-8d68883acdf4',
                clonedFromId: '7cf72375-4ee7-4a13-afeb-8d68883acdf4',
                description: 'hello',
                departments: [department]
            })
        );
    });
});

describe('setState transitions', () => {
    test('thorws on not found event', async () => {
        const user = await createUser({ id: '3535b2ee-806f-425c-a4f5-394d8b16f6f9' });
        await expect(
            Events.setState(user, '7cf72375-4ee7-4a13-afeb-8d68883acdf4', EventState.REVIEW)
        ).rejects.toEqual(new HTTP404Error('Event not found'));
    });

    test('thorws when not the author', async () => {
        const user = await createUser({ id: '3535b2ee-806f-425c-a4f5-394d8b16f6f9' });
        const malory = await createUser({ id: 'e470e2cf-2a8c-453a-92d8-e04d21ea1547' });
        const event = await createEvent({ authorId: user.id });

        await expect(Events.setState(malory, event.id, EventState.REVIEW)).rejects.toEqual(
            new HTTP403Error('Not authorized')
        );
    });

    test('DRAFT -> REVIEW', async () => {
        const user = await createUser({ id: '3535b2ee-806f-425c-a4f5-394d8b16f6f9' });
        const gbsl = await createDepartment({ name: 'GYMD' });
        const event = await createEvent({
            id: '7cf72375-4ee7-4a13-afeb-8d68883acdf4',
            departmentIds: [gbsl.id],
            authorId: user.id,
            state: EventState.DRAFT
        });
        const sem = await createSemester({
            start: faker.date.recent({ refDate: event.start }),
            end: faker.date.future({ refDate: event.end })
        });
        const regPeriod = await createRegistrationPeriod({
            eventRangeStart: faker.date.recent({ refDate: event.start }),
            departmentIds: [gbsl.id]
        });

        await expect(
            Events.setState(user, '7cf72375-4ee7-4a13-afeb-8d68883acdf4', EventState.REVIEW)
        ).resolves.toEqual({
            event: {
                /** expect the prepared event to be returned
                 * @see event.helpers.ts#prepareEvent
                 */
                ...prepareEvent(event),
                state: EventState.REVIEW,
                departmentIds: [gbsl.id],
                publishedVersionIds: [],
                updatedAt: expect.any(Date)
            },
            refused: []
        });
    });

    test('DRAFT -> PUBLISHED', async () => {
        const user = await createUser({ id: '3535b2ee-806f-425c-a4f5-394d8b16f6f9' });
        const event = await createEvent({
            id: '7cf72375-4ee7-4a13-afeb-8d68883acdf4',
            authorId: user.id,
            state: EventState.DRAFT
        });

        await expect(
            Events.setState(user, '7cf72375-4ee7-4a13-afeb-8d68883acdf4', EventState.PUBLISHED)
        ).rejects.toEqual(new HTTP400Error('Draft can only be set to review'));
    });

    test('DRAFT -> REFUSED', async () => {
        const user = await createUser({ id: '3535b2ee-806f-425c-a4f5-394d8b16f6f9' });
        const event = await createEvent({
            id: '7cf72375-4ee7-4a13-afeb-8d68883acdf4',
            authorId: user.id,
            state: EventState.DRAFT
        });

        await expect(
            Events.setState(user, '7cf72375-4ee7-4a13-afeb-8d68883acdf4', EventState.REFUSED)
        ).rejects.toEqual(new HTTP400Error('Draft can only be set to review'));
    });

    test('REFUSED -> PUBLISHED', async () => {
        const user = await createUser({ id: '3535b2ee-806f-425c-a4f5-394d8b16f6f9' });
        const event = await createEvent({
            id: '7cf72375-4ee7-4a13-afeb-8d68883acdf4',
            authorId: user.id,
            state: EventState.REFUSED
        });

        await expect(
            Events.setState(user, '7cf72375-4ee7-4a13-afeb-8d68883acdf4', EventState.PUBLISHED)
        ).rejects.toEqual(new HTTP400Error('REFUSED state is immutable'));
    });

    test('PUBLISHED -> REFUSED', async () => {
        const user = await createUser({ id: '3535b2ee-806f-425c-a4f5-394d8b16f6f9' });
        const event = await createEvent({
            id: '7cf72375-4ee7-4a13-afeb-8d68883acdf4',
            authorId: user.id,
            state: EventState.PUBLISHED
        });

        await expect(
            Events.setState(user, '7cf72375-4ee7-4a13-afeb-8d68883acdf4', EventState.REFUSED)
        ).rejects.toEqual(new HTTP400Error('PUBLISHED state is immutable'));
    });

    test('versioned DRAFT -> REVIEW', async () => {
        const user = await createUser({ id: '3535b2ee-806f-425c-a4f5-394d8b16f6f9' });
        const parent = await createEvent({
            id: '85858beb-1a47-45cd-9c3f-e89834064e2a',
            authorId: user.id,
            state: EventState.PUBLISHED
        });
        const event = await createEvent({
            id: '0755243d-10b4-4450-a239-30478df36b71',
            authorId: user.id,
            state: EventState.DRAFT,
            parentId: parent.id
        });

        /** expect the prepared event to be returned
         * @see event.helpers.ts#prepareEvent
         */
        await expect(Events.setState(user, event.id, EventState.REVIEW)).resolves.toEqual({
            event: {
                ...prepareEvent(event),
                state: EventState.REVIEW,
                departmentIds: [],
                publishedVersionIds: [],
                updatedAt: expect.any(Date)
            },
            parent: prepareEvent(parent),
            refused: []
        });
    });

    test('REVIEW -> PUBLISHED', async () => {
        const admin = await createUser({ role: Role.ADMIN });
        const user = await createUser({});
        const event = await createEvent({ authorId: user.id, state: EventState.REVIEW, userIds: [user.id] });

        /** expect the prepared event to be returned
         * @see event.helpers.ts#prepareEvent
         */
        await expect(Events.setState(admin, event.id, EventState.PUBLISHED)).resolves.toEqual({
            event: {
                ...prepareEvent(event),
                linkedUserIds: [user.id],
                state: EventState.PUBLISHED,
                departmentIds: [],
                publishedVersionIds: [],
                updatedAt: expect.any(Date)
            },
            refused: []
        });
    });

    test('versioned DRAFT of old version -> REVIEW', async () => {
        const user = await createUser({ id: '3535b2ee-806f-425c-a4f5-394d8b16f6f9' });
        const ancestor1 = await createEvent({
            id: 'e1a38f26-8da7-43b4-be5d-49ee81d20490',
            authorId: user.id,
            state: EventState.PUBLISHED
        });
        const ancestor2 = await createEvent({
            id: 'b026edeb-819b-42e0-bd5f-e3d897b8e7ab',
            authorId: user.id,
            state: EventState.PUBLISHED,
            parentId: ancestor1.id
        });
        const event = await createEvent({
            id: 'b793261c-b6cd-4d4d-94d0-7bffbc671a76',
            authorId: user.id,
            state: EventState.DRAFT,
            parentId: ancestor2.id
        });

        /** expect the prepared event to be returned
         * @see event.helpers.ts#prepareEvent
         */
        await expect(Events.setState(user, event.id, EventState.REVIEW)).resolves.toEqual({
            event: {
                ...prepareEvent(event),
                state: EventState.REVIEW,
                departmentIds: [],
                parentId: ancestor1.id,
                publishedVersionIds: [],
                updatedAt: expect.any(Date)
            },
            parent: {
                ...prepareEvent(ancestor1),
                publishedVersionIds: [ancestor2.id]
            },
            refused: []
        });
    });
    test('versioned REVIEW version -> PUBLISHED', async () => {
        const user = await createUser({ id: '3535b2ee-806f-425c-a4f5-394d8b16f6f9' });
        const current = await createEvent({
            id: 'edbef86b-c527-4fda-aaa0-b4638618dde3',
            authorId: user.id,
            description: 'hello',
            state: EventState.PUBLISHED
        });
        const nextCurrent = await createEvent({
            id: '0c9a59a4-0be9-40a8-80bc-b5a9c228166d',
            authorId: user.id,
            description: 'fancy hello',
            userIds: [user.id],
            state: EventState.REVIEW,
            parentId: current.id
        });
        const admin = await createUser({ id: '1dc09750-e026-4f81-923f-0d50202297c7', role: Role.ADMIN });
        await setTimeout(100);

        const newCurrent = {
            ...prepareEvent(nextCurrent),
            id: current.id,
            updatedAt: expect.any(Date),
            state: EventState.PUBLISHED,
            departments: undefined,
            departmentIds: [],
            linkedUserIds: [user.id],
            children: undefined,
            parentId: null,
            publishedVersionIds: [nextCurrent.id]
        };

        const oldCurrent = {
            ...prepareEvent(current),
            id: nextCurrent.id,
            updatedAt: expect.any(Date),
            departmentIds: [],
            linkedUserIds: [],
            parentId: current.id,
            publishedVersionIds: []
        };
        const result = await Events.setState(admin, nextCurrent.id, EventState.PUBLISHED);
        await expect(result).toEqual({
            event: newCurrent,
            previous: oldCurrent,
            refused: []
        });
    });

    test('REVIEW -> PUBLISHED: review replaces model assigned to a group', async () => {
        const admin = await createUser({ role: Role.ADMIN });
        const user = await createUser({});
        const current = await createEvent({ authorId: user.id, state: EventState.PUBLISHED });
        const event = await createEvent({
            authorId: user.id,
            state: EventState.REVIEW,
            parentId: current.id
        });
        const group = await createEventGroup({ userIds: [user.id], eventIds: [current.id] });

        /** expect the prepared event to be returned
         * @see event.helpers.ts#prepareEvent
         */
        await expect(Events.setState(admin, event.id, EventState.PUBLISHED)).resolves.toEqual({
            event: {
                ...prepareEvent(event),
                id: current.id,
                state: EventState.PUBLISHED,
                departmentIds: [],
                parentId: null,
                publishedVersionIds: [event.id],
                updatedAt: expect.any(Date)
            },
            previous: {
                ...prepareEvent(current),
                id: event.id,
                parentId: current.id,
                departmentIds: [],
                publishedVersionIds: [],
                updatedAt: expect.any(Date)
            },
            refused: []
        });
        await expect(EventGroups.events(user, group.id)).resolves.toEqual([
            {
                ...prepareEvent(event),
                id: current.id,
                state: EventState.PUBLISHED,
                departmentIds: [],
                parentId: null,
                publishedVersionIds: [event.id],
                updatedAt: expect.any(Date)
            }
        ]);
    });
});

describe('destroyEvent', () => {
    test('destroy DRAFT', async () => {
        const user = await createUser({ id: '3535b2ee-806f-425c-a4f5-394d8b16f6f9' });
        const event = await createEvent({
            id: '7cf72375-4ee7-4a13-afeb-8d68883acdf4',
            authorId: user.id,
            state: EventState.DRAFT
        });

        await expect(Events.destroy(user, event.id)).resolves.toEqual(prepareEvent(event));
    });
    test('destroy REVIEW', async () => {
        const user = await createUser({ id: '3535b2ee-806f-425c-a4f5-394d8b16f6f9' });
        const event = await createEvent({
            id: '7cf72375-4ee7-4a13-afeb-8d68883acdf4',
            authorId: user.id,
            state: EventState.REVIEW
        });

        await expect(Events.destroy(user, event.id)).resolves.toEqual(
            prepareEvent({
                ...event,
                deletedAt: expect.any(Date),
                updatedAt: expect.any(Date)
            })
        );
    });
    test('destroy REFUSED', async () => {
        const user = await createUser({ id: '3535b2ee-806f-425c-a4f5-394d8b16f6f9' });
        const event = await createEvent({
            id: '7cf72375-4ee7-4a13-afeb-8d68883acdf4',
            authorId: user.id,
            state: EventState.REFUSED
        });

        await expect(Events.destroy(user, event.id)).resolves.toEqual(
            prepareEvent({
                ...event,
                deletedAt: expect.any(Date),
                updatedAt: expect.any(Date)
            })
        );
    });
    test('destroy PUBLISHED', async () => {
        const user = await createUser({ id: '3535b2ee-806f-425c-a4f5-394d8b16f6f9' });
        const event = await createEvent({
            id: '7cf72375-4ee7-4a13-afeb-8d68883acdf4',
            authorId: user.id,
            state: EventState.PUBLISHED
        });

        await expect(Events.destroy(user, event.id)).resolves.toEqual(
            prepareEvent({
                ...event,
                deletedAt: expect.any(Date),
                updatedAt: expect.any(Date)
            })
        );
    });

    test('user can not delete other users event', async () => {
        const user = await createUser({ id: '3535b2ee-806f-425c-a4f5-394d8b16f6f9' });
        const malory = await createUser({ id: '10f61d90-22dd-495d-80b0-76f50f8bd3eb' });
        const event = await createEvent({
            id: '7cf72375-4ee7-4a13-afeb-8d68883acdf4',
            authorId: user.id,
            state: EventState.PUBLISHED
        });

        await expect(Events.destroy(malory, event.id)).rejects.toEqual(new HTTP403Error('Not authorized'));
    });
    test('admin can delete users event', async () => {
        const user = await createUser({ id: '3535b2ee-806f-425c-a4f5-394d8b16f6f9' });
        const admin = await createUser({ id: 'ccccbd50-99ee-4e75-bb83-d6517ea604b2', role: Role.ADMIN });
        const event = await createEvent({
            id: '7cf72375-4ee7-4a13-afeb-8d68883acdf4',
            authorId: user.id,
            state: EventState.PUBLISHED
        });

        await expect(Events.destroy(admin, event.id)).resolves.toEqual(
            prepareEvent({
                ...event,
                deletedAt: expect.any(Date),
                updatedAt: expect.any(Date)
            })
        );
    });
});

describe('allEvents', () => {
    const setup = async () => {
        const maria = await createUser({});
        const jack = await createUser({ role: Role.ADMIN });

        const pub1 = await createEvent({ authorId: maria.id, state: EventState.PUBLISHED });
        const draft1 = await createEvent({ authorId: maria.id, state: EventState.DRAFT });
        const refused1 = await createEvent({ authorId: maria.id, state: EventState.REFUSED });
        const review1 = await createEvent({ authorId: maria.id, state: EventState.REVIEW });

        const pub2 = await createEvent({ authorId: jack.id, state: EventState.PUBLISHED });
        const draft2 = await createEvent({ authorId: jack.id, state: EventState.DRAFT });
        return { maria, jack, pub1, draft1, refused1, review1, pub2, draft2 };
    };
    test('all published Events for anonyme user', async () => {
        const { pub1, pub2 } = await setup();
        const published = await Events.published();
        expect(published).toHaveLength(2);
        expect(_.orderBy(published, ['id'])).toEqual(
            _.orderBy([prepareEvent(pub1), prepareEvent(pub2)], ['id'])
        );
    });
    test('all published Events and the owned events for user', async () => {
        const { maria, pub1, draft1, refused1, review1, pub2 } = await setup();
        const all = await Events.all(maria);
        expect(all).toHaveLength(5);
        expect(_.orderBy(all, ['id'])).toEqual(
            _.orderBy(
                [
                    prepareEvent(pub1),
                    prepareEvent(pub2),
                    prepareEvent(draft1),
                    prepareEvent(refused1),
                    prepareEvent(review1)
                ],
                ['id']
            )
        );
    });
    test('all Published, Reviews, Refuesd and owned events for admin', async () => {
        const { jack, pub1, refused1, review1, pub2, draft2 } = await setup();
        const all = await Events.all(jack);
        expect(all).toHaveLength(5);
        expect(_.sortBy(all, ['id'])).toEqual(
            _.sortBy(
                [
                    prepareEvent(pub1),
                    prepareEvent(pub2),
                    prepareEvent(refused1),
                    prepareEvent(review1),
                    prepareEvent(draft2)
                ],
                ['id']
            )
        );
    });
});

describe('cloneEvent', () => {
    test('clone Event', async () => {
        const reto = await createUser({ id: '3535b2ee-806f-425c-a4f5-394d8b16f6f9' });
        const maria = await createUser({ id: '8b2774ad-a9e7-4e49-850b-8a36ed6cef0a' });
        const event = await createEvent({
            id: '7cf72375-4ee7-4a13-afeb-8d68883acdf4',
            authorId: maria.id,
            state: EventState.PUBLISHED,
            userIds: [maria.id, reto.id].sort(),
            createdAt: new Date(2021, 1, 1),
            updatedAt: new Date(2021, 1, 2)
        });
        expect(prepareEvent(event).linkedUserIds.sort()).toEqual([maria.id, reto.id].sort());

        const clone = await Events.cloneModel(reto, event.id);
        expect(clone).toHaveProperty('id', expect.any(String));
        expect(clone).not.toHaveProperty('createdAt', event.createdAt);
        expect(clone).not.toHaveProperty('updatedAt', event.updatedAt);
        expect(clone).toEqual(
            prepareEvent({
                ...event,
                id: expect.not.stringMatching(event.id),
                authorId: reto.id,
                state: EventState.DRAFT,
                cloned: true,
                clonedFromId: event.id,
                createdAt: expect.any(Date),
                updatedAt: expect.any(Date)
            })
        );
    });
    test('clone Event with departments', async () => {
        const reto = await await createUser({ id: '3535b2ee-806f-425c-a4f5-394d8b16f6f9' });
        const maria = await await createUser({ id: 'b48d8aa1-e83b-4e02-b01b-7f06cc188c99' });
        const dep1 = await createDepartment({ id: 'ed588f55-0e3b-425c-8adf-87cb15b80ac2' });
        const dep2 = await createDepartment({ id: '326ab517-582d-4bc5-bd42-44c23b622abf' });
        const event = await createEvent({
            id: '7cf72375-4ee7-4a13-afeb-8d68883acdf4',
            authorId: maria.id,
            state: EventState.PUBLISHED,
            createdAt: new Date(2021, 1, 1),
            updatedAt: new Date(2021, 1, 2),
            departments: {
                connect: [{ id: dep1.id }, { id: dep2.id }]
            }
        });

        const clone = await Events.cloneModel(reto, event.id);
        expect(clone).toEqual(
            prepareEvent({
                ...event,
                id: expect.not.stringMatching(event.id),
                clonedFromId: event.id,
                authorId: reto.id,
                state: EventState.DRAFT,
                cloned: true,
                departments: [dep1, dep2],
                createdAt: expect.any(Date),
                updatedAt: expect.any(Date)
            })
        );
    });
    test('clone Event with linked users', async () => {
        const reto = await await createUser({ id: '3535b2ee-806f-425c-a4f5-394d8b16f6f9' });
        const maria = await await createUser({ id: 'b48d8aa1-e83b-4e02-b01b-7f06cc188c99' });
        const event = await createEvent({
            id: '7cf72375-4ee7-4a13-afeb-8d68883acdf4',
            authorId: maria.id,
            state: EventState.PUBLISHED,
            createdAt: new Date(2021, 1, 1),
            updatedAt: new Date(2021, 1, 2),
            linkedUsers: {
                connect: [{ id: reto.id }, { id: maria.id }]
            }
        });

        const clone = await Events.cloneModel(reto, event.id);
        expect(clone).toEqual(
            prepareEvent({
                ...event,
                id: expect.not.stringMatching(event.id),
                clonedFromId: event.id,
                authorId: reto.id,
                state: EventState.DRAFT,
                cloned: true,
                linkedUsers: [reto, maria],
                createdAt: expect.any(Date),
                updatedAt: expect.any(Date)
            })
        );
    });
});

describe('normalize audience', () => {
    const setup = async () => {
        const departments = await Promise.all([
            createDepartment({ letter: 'G', classLetters: ['a', 'b', 'c'], schoolYears: 4 }),
            createDepartment({ letter: 'G', classLetters: ['x', 'y'], schoolYears: 4 }),
            createDepartment({ letter: 'F', classLetters: ['a', 'b'], schoolYears: 3 })
        ]);
        return departments;
    };
    test('respacts distinct classes and departments', async () => {
        const deps = await setup();
        const normalized = normalizeAudience(deps, {
            departmentIds: [deps[1].id],
            classGroups: [],
            classes: ['28Ga'],
            start: new Date('2025-04-07'),
            end: new Date('2025-04-08')
        });
        expect(normalized.classGroups).toHaveLength(0);
        expect(normalized.classes).toEqual(['28Ga']);
    });
    test('removes classes not being part of the semester', async () => {
        const deps = await setup();
        const normalized = normalizeAudience(deps, {
            departmentIds: [],
            classGroups: [],
            classes: ['28Ga', '29Ga'],
            start: new Date('2025-04-07'),
            end: new Date('2025-04-08')
        });
        expect(normalized.classGroups).toHaveLength(0);
        expect(normalized.classes).toEqual(['28Ga']);
    });
    test('removes classes already active by departments', async () => {
        const deps = await setup();
        const normalized = normalizeAudience(deps, {
            departmentIds: [deps[0].id],
            classGroups: [],
            classes: ['28Ga', '25Ga', '25Fa'],
            start: new Date('2025-04-07'),
            end: new Date('2025-04-08')
        });
        expect(normalized.classGroups).toHaveLength(0);
        expect(normalized.classes).toEqual(['25Fa']);
    });
    test('removes classes already active by classGroups', async () => {
        const deps = await setup();
        const normalized = normalizeAudience(deps, {
            departmentIds: [],
            classGroups: ['28G'],
            classes: ['28Ga', '25Ga', '25Fa'],
            start: new Date('2025-04-07'),
            end: new Date('2025-04-08')
        });
        expect(normalized.classGroups).toEqual(['28G']);
        expect(normalized.classes.sort()).toEqual(['25Ga', '25Fa'].sort());
    });
    test('removes invalid classGroups', async () => {
        const deps = await setup();
        const normalized = normalizeAudience(deps, {
            departmentIds: [],
            classGroups: ['28'],
            classes: ['28Ga', '25Ga', '25Fa'],
            start: new Date('2025-04-07'),
            end: new Date('2025-04-08')
        });
        expect(normalized.classGroups).toHaveLength(0);
        expect(normalized.classes.sort()).toEqual(['28Ga', '25Ga', '25Fa'].sort());
    });
    test('removes invalid classes', async () => {
        const deps = await setup();
        const normalized = normalizeAudience(deps, {
            departmentIds: [],
            classGroups: [],
            classes: ['28Gf', '', 'ABGa', 'asdfasdf', '27Fa'],
            start: new Date('2025-04-07'),
            end: new Date('2025-04-08')
        });
        expect(normalized.classGroups).toHaveLength(0);
        expect(normalized.classes.sort()).toEqual(['27Fa'].sort());
    });
    test('removes classGroups already active by departments', async () => {
        const deps = await setup();
        const normalized = normalizeAudience(deps, {
            departmentIds: [deps[0].id, deps[1].id],
            classGroups: ['28G'],
            classes: ['28Ga', '25Ga', '25Fa'],
            start: new Date('2025-04-07'),
            end: new Date('2025-04-08')
        });
        expect(normalized.classGroups).toHaveLength(0);
        expect(normalized.classes).toEqual(['25Fa']);
    });
    test('keeps classGroups when not all depLetters are covered departments', async () => {
        const deps = await setup();
        const normalized = normalizeAudience(deps, {
            departmentIds: [deps[0].id],
            classGroups: ['28G'],
            classes: ['28Ga', '25Ga', '25Fa'],
            start: new Date('2025-04-07'),
            end: new Date('2025-04-08')
        });
        expect(normalized.classGroups).toEqual(['28G']);
        expect(normalized.classes).toEqual(['25Fa']);
    });
    test('removes classes which did already graduate more than a year ago or are not at the school', async () => {
        const deps = await setup();
        const normalized = normalizeAudience(deps, {
            departmentIds: [],
            classGroups: [],
            classes: ['22Ga', '23Ga', '24Ga', '25Ga', '26Ga', '27Ga', '28Ga'],
            start: new Date('2024-04-07'),
            end: new Date('2024-04-08')
        });
        expect(normalized.classGroups).toHaveLength(0);
        expect(normalized.classes.sort()).toEqual(['24Ga', '25Ga', '26Ga', '27Ga'].sort());
    });
    test('removes classGroups which did already graduate more than a year ago or are not at the school', async () => {
        const deps = await setup();
        const normalized = normalizeAudience(deps, {
            departmentIds: [],
            classGroups: ['22G', '23G', '24G', '25G', '26G', '27G', '28G'],
            classes: [],
            start: new Date('2024-04-07'),
            end: new Date('2024-04-08')
        });
        expect(normalized.classGroups.sort()).toEqual(['24G', '25G', '26G', '27G'].sort());
        expect(normalized.classes).toHaveLength(0);
    });
});
