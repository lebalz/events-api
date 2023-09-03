import { prismaMock } from '../__mocks__/singleton'
import { EventState, Role } from '@prisma/client'
import { getMockProps as getMockedUser } from '../__mocks__/users.mocks';
import { getMockProps as getMockedDepartment } from './departments.test';
import Events from '../src/models/events'
import { prepareEvent } from '../src/models/event.helpers';
import { HTTP400Error, HTTP403Error, HTTP404Error } from '../src/utils/errors/Errors';
import { createMocks, getMockProps } from '../__mocks__/events.mocks';

describe('find event', () => {
	test('returns event', async () => {
		const user = getMockedUser({ id: 'user-1' })
		const event = getMockProps('user-1', { id: 'event-1' })
		createMocks([event]);

		await expect(Events.findModel(user, 'event-1')).resolves.toEqual({
			/** expect the prepared event to be returned
			 * @see event.helpers.ts#prepareEvent 
			 */
			...event,
			author: undefined,
			departments: undefined,
			departmentIds: [],
			jobId: undefined,
			job: undefined,
			children: undefined,
			versionIds: []
		});
	});
	test('admin can get review event', async () => {
		const user = getMockedUser({ id: 'user-1' })
		const admin = getMockedUser({ id: 'admin', role: Role.ADMIN });
		const event = getMockProps(user.id, { id: 'event-1', state: EventState.REVIEW });
		createMocks([event]);
		await expect(Events.findModel(admin, event.id)).resolves.toEqual(prepareEvent(event));
	});
	test('admin can get refused event', async () => {
		const user = getMockedUser({ id: 'user-1' })
		const admin = getMockedUser({ id: 'admin', role: Role.ADMIN });
		const event = getMockProps(user.id, { id: 'event-1', state: EventState.REFUSED });
		createMocks([event]);
		await expect(Events.findModel(admin, event.id)).resolves.toEqual(prepareEvent(event));
	});
	test('admin can not get draft event', async () => {
		const user = getMockedUser({ id: 'user-1' })
		const admin = getMockedUser({ id: 'admin', role: Role.ADMIN });
		const event = getMockProps(user.id, { id: 'event-1', state: EventState.DRAFT });
		createMocks([event]);
		await expect(Events.findModel(admin, event.id)).rejects.toEqual(new HTTP403Error('Not authorized'));
	});
	test ('throws 404 if event not found', async () => {
		const user = getMockedUser({ id: 'user-1' })
		await expect(Events.findModel(user, 'event-1')).rejects.toEqual(
			new HTTP404Error('Event not found')
		);
	})
});

describe('updateEvent', () => {
	test('update DRAFT', async () => {
		const user = getMockedUser({ id: 'user-1' })
		const event = getMockProps(user.id, { id: 'event-1', state: EventState.DRAFT })
		createMocks([event]);

		await expect(Events.updateModel(user, event.id, { description: 'hello' })).resolves.toEqual(prepareEvent({
			...event,
			description: 'hello'
		}));
	});
	test('can add departments to a draft', async () => {
		const user = getMockedUser({ id: 'user-1' })
		const event = getMockProps(user.id, { id: 'event-1', state: EventState.DRAFT })
		const dep1 = getMockedDepartment({ id: 'dep-1' });
		createMocks([event], [dep1]);
		expect(prepareEvent(event).departmentIds).toEqual([])

		await expect(Events.updateModel(user, event.id, { description: 'hello', departmentIds: [dep1.id] })).resolves.toEqual(prepareEvent({
			...event,
			description: 'hello',
			departments: [dep1],
		}));
	});
	test('can not update not existant event', async () => {
		const user = getMockedUser({ id: 'user-1' })

		await expect(Events.updateModel(user, 'event-1', {})).rejects.toEqual(
			new HTTP404Error('Event not found')
		);
	});
	test('can not update another users events', async () => {
		const user = getMockedUser({ id: 'user-1' })
		const event = getMockProps('felix', { id: 'event-1', state: EventState.DRAFT })
		createMocks([event]);

		await expect(Events.updateModel(user, 'event-1', { description: 'hello' })).rejects.toEqual(
			new HTTP403Error('Not authorized')
		);
	});

	test('update PUBLISHED creates a version', async () => {
		const user = getMockedUser({ id: 'user-1' })
		const event = getMockProps(user.id, { id: 'event-1', state: EventState.PUBLISHED, description: 'published' })
		createMocks([event]);

		await expect(Events.updateModel(user, 'event-1', { description: 'hello' })).resolves.toEqual(prepareEvent({
			...event,
			id: 'event-2',
			state: EventState.DRAFT,
			createdAt: expect.any(Date),
			updatedAt: expect.any(Date),
			parentId: 'event-1',
			description: 'hello'
		}));
	});

	test('update PUBLISHED with departments creates a version', async () => {
		const user = getMockedUser({ id: 'user-1' })
		const event = getMockProps(user.id, { id: 'event-1', state: EventState.PUBLISHED, description: 'published' })
		const department = getMockedDepartment({ id: 'dep-1' });
		createMocks([event], [department]);

		await expect(Events.updateModel(user, 'event-1', { description: 'hello', departmentIds: [department.id]})).resolves.toEqual(prepareEvent({
			...event,
			id: 'event-2',
			state: EventState.DRAFT,
			createdAt: expect.any(Date),
			updatedAt: expect.any(Date),
			parentId: 'event-1',
			description: 'hello',
			departments: [department]
		}));
	});
});

describe('setState transitions', () => {
	const user = getMockedUser({ id: 'user-1' })

	test('thorws on not found event', async () => {
		await expect(Events.setState(user, 'event-1', EventState.REVIEW)).rejects.toEqual(
			new HTTP404Error('Event not found')
		);
	});

	test('thorws when not the author', async () => {
		const malory = getMockedUser({ id: 'malory' })
		const event = getMockProps(user.id, {});
		createMocks([event]);
		await expect(Events.setState(malory, event.id, EventState.REVIEW)).rejects.toEqual(
			new HTTP403Error('Not authorized')
		);
	});

	test('DRAFT -> REVIEW', async () => {
		const event = getMockProps('user-1', { id: 'event-1', state: EventState.DRAFT })
		createMocks([event]);

		await expect(Events.setState(user, 'event-1', EventState.REVIEW)).resolves.toEqual({
			/** expect the prepared event to be returned
			 * @see event.helpers.ts#prepareEvent 
			 */
			...event,
			state: EventState.REVIEW,
			author: undefined,
			departments: undefined,
			departmentIds: [],
			jobId: undefined,
			job: undefined,
			children: undefined,
			versionIds: []
		});
	});

	test('DRAFT -> PUBLISHED', async () => {
		const event = getMockProps('user-1', { id: 'event-1', state: EventState.DRAFT })
		createMocks([event]);

		await expect(Events.setState(user, 'event-1', EventState.PUBLISHED)).rejects.toEqual(
			new HTTP400Error('Draft can only be set to review')
		);
	});

	test('DRAFT -> REFUSED', async () => {
		const event = getMockProps('user-1', { id: 'event-1', state: EventState.DRAFT })
		createMocks([event]);

		await expect(Events.setState(user, 'event-1', EventState.REFUSED)).rejects.toEqual(
			new HTTP400Error('Draft can only be set to review')
		);
	});

	test('REFUSED -> PUBLISHED', async () => {
		const event = getMockProps('user-1', { id: 'event-1', state: EventState.REFUSED })
		createMocks([event]);

		await expect(Events.setState(user, 'event-1', EventState.PUBLISHED)).rejects.toEqual(
			new HTTP400Error('REFUSED state is immutable')
		);
	});

	test('PUBLISHED -> REFUSED', async () => {
		const event = getMockProps('user-1', { id: 'event-1', state: EventState.PUBLISHED })
		createMocks([event]);

		await expect(Events.setState(user, 'event-1', EventState.REFUSED)).rejects.toEqual(
			new HTTP400Error('PUBLISHED state is immutable')
		);
	});

	test('versioned DRAFT -> REVIEW', async () => {
		const parent = getMockProps('user-1', { id: 'parent', state: EventState.PUBLISHED })
		const event = getMockProps('user-1', { id: 'child', state: EventState.DRAFT, parentId: parent.id })
		createMocks([parent, event]);

		prismaMock.$queryRaw.mockResolvedValueOnce([{ id: parent.id, parent_id: null }]);

		/** expect the prepared event to be returned
		 * @see event.helpers.ts#prepareEvent 
		 */
		await expect(Events.setState(user, event.id, EventState.REVIEW)).resolves.toEqual({
			...event,
			state: EventState.REVIEW,
			author: undefined,
			departments: undefined,
			departmentIds: [],
			jobId: undefined,
			job: undefined,
			children: undefined,
			versionIds: []
		});
	});

	test('versioned DRAFT of old version -> REVIEW', async () => {
		const ancestor1 = getMockProps('user-1', { id: 'ancestor1', state: EventState.PUBLISHED })
		const ancestor2 = getMockProps('user-1', { id: 'ancestor2', state: EventState.PUBLISHED, parentId: ancestor1.id })
		const event = getMockProps('user-1', { id: 'child', state: EventState.DRAFT, parentId: ancestor2.id })
		createMocks([ancestor1, ancestor2, event]);

		prismaMock.$queryRaw.mockResolvedValueOnce([{ id: ancestor1.id, parent_id: null }]);

		/** expect the prepared event to be returned
		 * @see event.helpers.ts#prepareEvent 
		 */
		await expect(Events.setState(user, event.id, EventState.REVIEW)).resolves.toEqual({
			...event,
			state: EventState.REVIEW,
			author: undefined,
			departments: undefined,
			departmentIds: [],
			jobId: undefined,
			job: undefined,
			children: undefined,
			parentId: ancestor1.id,
			versionIds: []
		});
	});
	test('versioned REVIEW version -> PUBLISHED', async () => {
		const ancestor1 = getMockProps('user-1', { id: 'ancestor1', description: 'hello', state: EventState.PUBLISHED })
		const event = getMockProps('user-1', { id: 'child', description: 'fancy hello', state: EventState.REVIEW, parentId: ancestor1.id })
		createMocks([ancestor1, event]);
		prismaMock.$transaction.mockImplementation((val) => val as any)
		prismaMock.event.findMany.mockResolvedValue([]);
		prismaMock.event.updateMany.mockResolvedValue({ count: 0 });
		const admin = getMockedUser({ id: 'admin', role: Role.ADMIN });

		await expect(Events.setState(admin, event.id, EventState.PUBLISHED)).resolves.toEqual({
			...event,
			state: EventState.PUBLISHED,
			id: ancestor1.id,
			author: undefined,
			departments: undefined,
			departmentIds: [],
			jobId: undefined,
			job: undefined,
			children: undefined,
			parentId: null,
			versionIds: ['child']
		});
		await expect(Events.findModel(user, event.id)).resolves.toEqual({
			...ancestor1,
			id: event.id,
			author: undefined,
			departments: undefined,
			departmentIds: [],
			jobId: undefined,
			job: undefined,
			children: undefined,
			parentId: ancestor1.id,
			versionIds: []
		});
	});

});

describe('destroyEvent', () => {
	test('destroy DRAFT', async () => {
		const user = getMockedUser({ id: 'user-1' })
		const event = getMockProps(user.id, { id: 'event-1', state: EventState.DRAFT })
		createMocks([event]);
		await expect(Events.destroy(user, event.id)).resolves.toEqual(prepareEvent(event));
	});
	test('destroy REVIEW', async () => {
		const user = getMockedUser({ id: 'user-1' })
		const event = getMockProps(user.id, { id: 'event-1', state: EventState.REVIEW })
		createMocks([event]);
		await expect(Events.destroy(user, event.id)).resolves.toEqual(prepareEvent({
			...event,
			deletedAt: expect.any(Date)
		}));
	});
	test('destroy REFUSED', async () => {
		const user = getMockedUser({ id: 'user-1' })
		const event = getMockProps(user.id, { id: 'event-1', state: EventState.REFUSED })
		createMocks([event]);
		await expect(Events.destroy(user, event.id)).resolves.toEqual(prepareEvent({
			...event,
			deletedAt: expect.any(Date)
		}));
	});
	test('destroy PUBLISHED', async () => {
		const user = getMockedUser({ id: 'user-1' })
		const event = getMockProps(user.id, { id: 'event-1', state: EventState.PUBLISHED })
		createMocks([event]);
		await expect(Events.destroy(user, event.id)).resolves.toEqual(prepareEvent({
			...event,
			deletedAt: expect.any(Date)
		}));
	});

	test('user can not delete other users event', async () => {
		const user = getMockedUser({ id: 'user-1' })
		const malory = getMockedUser({ id: 'malory' })
		const event = getMockProps(user.id, { id: 'event-1', state: EventState.PUBLISHED })
		createMocks([event]);
		await expect(Events.destroy(malory, event.id)).rejects.toEqual(
			new HTTP403Error('Not authorized')
		);
	});
	test('admin can delete users event', async () => {
		const user = getMockedUser({ id: 'user-1' })
		const admin = getMockedUser({ id: 'malory', role: Role.ADMIN })
		const event = getMockProps(user.id, { id: 'event-1', state: EventState.PUBLISHED })
		createMocks([event]);
		await expect(Events.destroy(admin, event.id)).resolves.toEqual(prepareEvent({
			...event,
			deletedAt: expect.any(Date)
		}));
	});

});

describe('allEvents', () => {
	const maria = getMockedUser({ id: 'maria' });
	const jack = getMockedUser({ id: 'jack', role: Role.ADMIN });

	const pub1 = getMockProps(maria.id, { id: 'pub-1', state: EventState.PUBLISHED });
	const draft1 = getMockProps(maria.id, { id: 'draft-1', state: EventState.DRAFT });
	const refused1 = getMockProps(maria.id, { id: 'refused-1', state: EventState.REFUSED });
	const review1 = getMockProps(maria.id, { id: 'review-1', state: EventState.REVIEW });

	const pub2 = getMockProps(jack.id, { id: 'pub-2', state: EventState.PUBLISHED });
	const draft2 = getMockProps(jack.id, { id: 'draft-2', state: EventState.DRAFT });
	test('all published Events for anonyme user', async () => {
		createMocks([pub1, draft1, refused1, review1, pub2, draft2]);
		await expect(Events.all()).resolves.toEqual([
			prepareEvent(pub1),
			prepareEvent(pub2),
		]);
	});
	test('all published Events and the owned events for user', async () => {
		createMocks([pub1, draft1, refused1, review1, pub2, draft2]);
		await expect(Events.all(maria)).resolves.toEqual([
			prepareEvent(pub1),
			prepareEvent(draft1),
			prepareEvent(refused1),
			prepareEvent(review1),
			prepareEvent(pub2),
		]);
	});
	test('all Published, Reviews, Refuesd and owned events for admin', async () => {
		createMocks([pub1, draft1, refused1, review1, pub2, draft2]);
		await expect(Events.all(jack)).resolves.toEqual([
			prepareEvent(pub1),
			prepareEvent(refused1),
			prepareEvent(review1),
			prepareEvent(pub2),
			prepareEvent(draft2),
		]);
	});
});

describe('cloneEvent', () => {
	test('clone Event', async () => {
		const reto = getMockedUser({ id: 'user-1' })
		const maria = getMockedUser({ id: 'user-1' })
		const event = getMockProps(maria.id, { id: 'event-1', state: EventState.PUBLISHED, createdAt: new Date(2021, 1, 1), updatedAt: new Date(2021, 1, 2) })
		createMocks([event]);
		/** wait a bit to ensure createdAt/updatedAt properties are not accitentially equal to the original event */
		const clone = Events.cloneModel(reto, event.id);
		await expect(clone).resolves.toEqual(prepareEvent({
			...event,
			id: expect.not.stringMatching(event.id),
			authorId: reto.id,
			state: EventState.DRAFT,
			cloned: true,
			createdAt: expect.any(Date),
			updatedAt: expect.any(Date),
		}));
		await expect(clone).resolves.toHaveProperty('id', expect.any(String));
		await expect(clone).resolves.not.toHaveProperty('createdAt', event.createdAt);
		await expect(clone).resolves.not.toHaveProperty('updatedAt', event.updatedAt);
	});
	test('clone Event with departments', async () => {
		const reto = getMockedUser({ id: 'user-1' })
		const maria = getMockedUser({ id: 'user-1' })
		const dep1 = getMockedDepartment({ id: 'dep-1' });
		const dep2 = getMockedDepartment({ id: 'dep-2' });
		const event = getMockProps(maria.id, { id: 'event-1', state: EventState.PUBLISHED, createdAt: new Date(2021, 1, 1), updatedAt: new Date(2021, 1, 2) })

		createMocks([event], [dep1, dep2], [[event.id, [dep1.id, dep2.id]]]);
		/** wait a bit to ensure createdAt/updatedAt properties are not accitentially equal to the original event */

		const clone = Events.cloneModel(reto, event.id);
		await expect(clone).resolves.toEqual(prepareEvent({
			...event,
			id: expect.not.stringMatching(event.id),
			authorId: reto.id,
			state: EventState.DRAFT,
			cloned: true,
			departments: [dep1, dep2],
			createdAt: expect.any(Date),
			updatedAt: expect.any(Date),
		}));
	});
});