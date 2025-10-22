import { Prisma, Role } from '@prisma/client';
import EventGroups from '../../../src/models/eventGroup';
import { HTTP404Error } from '../../../src/utils/errors/Errors';
import prisma from '../../../src/prisma';
import { createUser } from './users.test';
import { generateEventGroup } from '../../factories/eventGroup';
import _ from 'lodash';
import { prepareEventGroup } from '../../../src/models/eventGroup.helpers';
import { createEvent } from './events.test';
import { prepareEvent } from '../../../src/models/event.helpers';

export const createEventGroup = async (
    props: Partial<Prisma.EventGroupUncheckedCreateInput> & { userIds: string[]; eventIds: string[] }
) => {
    return await prisma.eventGroup.create({
        data: generateEventGroup(props),
        include: {
            events: {
                select: {
                    id: true
                }
            },
            users: {
                select: {
                    id: true
                }
            }
        }
    });
};

describe('find eventGroup', () => {
    test('only members can get group', async () => {
        const alice = await createUser({});
        const bob = await createUser({});
        const admin = await createUser({ role: Role.ADMIN });
        const group = await createEventGroup({ userIds: [alice.id, bob.id], eventIds: [] });
        await expect(EventGroups.findModel(admin, group.id)).rejects.toEqual(new HTTP404Error('Not found'));
        await expect(EventGroups.findModel(alice, group.id)).resolves.toEqual({
            ...prepareEventGroup(group),
            eventIds: [],
            userIds: expect.arrayContaining([alice.id, bob.id])
        });
        await expect(EventGroups.findModel(bob, group.id)).resolves.toEqual({
            ...prepareEventGroup(group),
            eventIds: [],
            userIds: expect.arrayContaining([alice.id, bob.id])
        });
    });
});

describe('all groups of user', () => {
    test('can get all groups', async () => {
        const alice = await createUser({});
        const bob = await createUser({});
        const charlie = await createUser({});
        const groupMono = await createEventGroup({ userIds: [alice.id], eventIds: [] });
        const groupShared = await createEventGroup({ userIds: [alice.id, bob.id], eventIds: [] });
        const groupBobCharlie = await createEventGroup({ userIds: [charlie.id, bob.id], eventIds: [] });

        await expect(EventGroups.allOfUser(alice)).resolves.toEqual(
            expect.arrayContaining([groupMono, groupShared].map((g) => prepareEventGroup(g)))
        );
    });
});

describe('all events of group', () => {
    test('can get all events', async () => {
        const alice = await createUser({});
        const bob = await createUser({});
        const event = await createEvent({ authorId: alice.id });
        const group = await createEventGroup({ userIds: [alice.id, bob.id], eventIds: [event.id] });

        await expect(EventGroups.events(alice, group.id)).resolves.toEqual([prepareEvent(event)]);
    });
});

describe('all groups where an event is part of', () => {
    test('can get all groups', async () => {
        const alice = await createUser({});
        const bob = await createUser({});
        const event = await createEvent({ authorId: alice.id });
        const groupMono = await createEventGroup({ userIds: [alice.id], eventIds: [event.id] });
        const groupShared = await createEventGroup({ userIds: [alice.id, bob.id], eventIds: [event.id] });
        const groupBob = await createEventGroup({ userIds: [bob.id], eventIds: [event.id] });

        await expect(EventGroups.allOfEvent(event)).resolves.toEqual(
            expect.arrayContaining([groupMono, groupShared, groupBob].map((g) => prepareEventGroup(g)))
        );
    });
});

describe('internal: find raw event group model', () => {
    test('can raw record if allowed', async () => {
        const alice = await createUser({});
        const bob = await createUser({});
        const admin = await createUser({ role: Role.ADMIN });
        const group = await createEventGroup({ userIds: [alice.id], eventIds: [] });
        await expect(EventGroups._findRawModel(admin, group.id)).rejects.toEqual(
            new HTTP404Error('Not found')
        );
        await expect(EventGroups._findRawModel(bob, group.id)).rejects.toEqual(new HTTP404Error('Not found'));
        await expect(EventGroups._findRawModel(alice, group.id)).resolves.toEqual(group);
    });
});

describe('create group', () => {
    test('user can create a group', async () => {
        const alice = await createUser({});
        const event = await createEvent({ authorId: alice.id });
        await expect(
            EventGroups.createModel(alice, {
                name: 'Test',
                description: 'Test Description',
                event_ids: [event.id]
            })
        ).resolves.toEqual(
            expect.objectContaining({
                name: 'Test',
                description: 'Test Description',
                eventIds: [event.id],
                userIds: [alice.id]
            })
        );
    });
    test('user can not add others unpublished events on group creation', async () => {
        const alice = await createUser({});
        const bob = await createUser({});
        const event = await createEvent({ authorId: alice.id });
        const eventBob = await createEvent({ authorId: bob.id });
        const publicEventBob = await createEvent({ authorId: bob.id, state: 'PUBLISHED' });
        await expect(
            EventGroups.createModel(alice, {
                name: 'Test',
                description: 'Test Description',
                event_ids: [event.id, eventBob.id, publicEventBob.id]
            })
        ).resolves.toEqual(
            expect.objectContaining({
                name: 'Test',
                description: 'Test Description',
                eventIds: [event.id, publicEventBob.id].sort(),
                userIds: [alice.id]
            })
        );
    });
});

describe('update group', () => {
    test('user can update group', async () => {
        const alice = await createUser({});
        const bob = await createUser({});
        const event = await createEvent({ authorId: alice.id });
        const group = await createEventGroup({ userIds: [alice.id], eventIds: [] });
        await expect(
            EventGroups.updateModel(alice, group.id, {
                description: 'Dummy Test Description',
                eventIds: [event.id],
                userIds: [alice.id, bob.id]
            })
        ).resolves.toEqual(
            expect.objectContaining({
                description: 'Dummy Test Description',
                eventIds: [event.id],
                userIds: [alice.id, bob.id].sort()
            })
        );
    });
    test('user can not add others unpublished events', async () => {
        const alice = await createUser({});
        const bob = await createUser({});
        const event = await createEvent({ authorId: alice.id });
        const eventBob = await createEvent({ authorId: bob.id });
        const publicEventBob = await createEvent({ authorId: bob.id, state: 'PUBLISHED' });
        const group = await createEventGroup({ userIds: [alice.id], eventIds: [] });

        await expect(
            EventGroups.updateModel(alice, group.id, {
                description: 'Dummy Test Description',
                eventIds: [event.id, eventBob.id, publicEventBob.id]
            })
        ).resolves.toEqual(
            expect.objectContaining({
                description: 'Dummy Test Description',
                eventIds: [event.id, publicEventBob.id].sort()
            })
        );
    });
});

describe('destroy group', () => {
    test('user can destroy empty group', async () => {
        const alice = await createUser({});
        const group = await createEventGroup({ userIds: [alice.id], eventIds: [] });
        await expect(EventGroups.destroy(alice, group.id)).resolves.toEqual({
            eventGroup: prepareEventGroup(group),
            deletedEventIds: []
        });
    });
    test('user can destroy group with events: according events get unlinked', async () => {
        const alice = await createUser({});
        const event = await createEvent({ authorId: alice.id });
        const pubEvent = await createEvent({ authorId: alice.id, state: 'PUBLISHED' });
        const group = await createEventGroup({ userIds: [alice.id], eventIds: [event.id, pubEvent.id] });
        await expect(EventGroups.destroy(alice, group.id)).resolves.toEqual({
            eventGroup: {
                ...prepareEventGroup(group),
                eventIds: []
            },
            deletedEventIds: []
        });
    });
});

describe('clone group', () => {
    test("user can clone group and it's events", async () => {
        const alice = await createUser({});
        const bob = await createUser({});
        const event = await createEvent({ authorId: alice.id, description: 'Normal' });
        const pubEvent = await createEvent({
            authorId: alice.id,
            description: 'Published',
            state: 'PUBLISHED'
        });
        const eventBob = await createEvent({ authorId: bob.id, description: 'Bob', state: 'PUBLISHED' });
        const eventBobChild = await createEvent({
            authorId: bob.id,
            description: 'Bob Child',
            parentId: eventBob.id
        });

        const group = await createEventGroup({
            userIds: [alice.id, bob.id],
            eventIds: [event.id, pubEvent.id, eventBob.id, eventBobChild.id]
        });
        const clone = await EventGroups.cloneModel(alice, group.id);
        expect(clone).toEqual(
            expect.objectContaining({
                name: `${group.name} 📋`,
                description: group.description,
                userIds: [alice.id]
            })
        );
        const events = await prisma.event.findMany({
            where: {
                id: {
                    in: clone.eventIds
                }
            },
            include: {
                linkedUsers: { select: { id: true } },
                departments: { select: { id: true } },
                children: { select: { id: true, state: true, createdAt: true } }
            }
        });
        expect(events).toHaveLength(3);
        const clonedEvent = events.find((e) => e.description === 'Normal');
        expect(clonedEvent).toEqual({
            ...event,
            id: expect.any(String),
            createdAt: expect.any(Date),
            updatedAt: expect.any(Date),
            clonedFromId: event.id,
            authorId: alice.id,
            parentId: null
        });
        const clonedPubEvent = events.find((e) => e.description === 'Published');
        expect(clonedPubEvent).toEqual({
            ...pubEvent,
            id: expect.any(String),
            createdAt: expect.any(Date),
            updatedAt: expect.any(Date),
            clonedFromId: pubEvent.id,
            authorId: alice.id,
            state: 'DRAFT',
            parentId: null
        });
        const clonedEventBob = events.find((e) => e.description === 'Bob');
        expect(clonedEventBob).toEqual({
            ...eventBob,
            id: expect.any(String),
            createdAt: expect.any(Date),
            updatedAt: expect.any(Date),
            clonedFromId: eventBob.id,
            authorId: alice.id,
            state: 'DRAFT',
            parentId: null
        });
    });
});
