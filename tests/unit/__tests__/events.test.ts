import { EventState, Prisma, Role } from '@prisma/client'
import { createDepartment } from './departments.test';
import Events from '../../../src/models/events'
import { prepareEvent } from '../../../src/models/event.helpers';
import { HTTP400Error, HTTP403Error, HTTP404Error } from '../../../src/utils/errors/Errors';
import prismock from '../__mocks__/prismockClient';
import { createUser } from './users.test';
import { generateEvent } from '../../factories/event';
import { setTimeout } from 'timers/promises';

export const createEvent = async (props: (Partial<Prisma.EventUncheckedCreateInput> & {authorId: string})) => {
	return await prismock.event.create({
		data: generateEvent(props)
	});
}

describe('find event', () => {
	test('returns event', async () => {
		const user = await createUser({ id: 'user-1' })
		const event = await createEvent({ id: 'event-1', authorId: user.id })

		await expect(Events.findModel(user, 'event-1')).resolves.toEqual({
			/** expect the prepared event to be returned
			 * @see event.helpers.ts#prepareEvent 
			 */
			...event,
			author: undefined,
			departments: undefined,
			departmentIds: [],
			job: undefined,
			children: undefined,
			versionIds: []
		});
	});
	test('admin can get review event', async () => {
		const user = await createUser({ id: 'user-1' })
		const admin = await createUser({ id: 'admin', role: Role.ADMIN });
		const event = await createEvent({ id: 'event-1', authorId: user.id, state: EventState.REVIEW });
		await expect(Events.findModel(admin, event.id)).resolves.toEqual(prepareEvent(event));
	});
	test('admin can get refused event', async () => {
		const user = await createUser({ id: 'user-1' })
		const admin = await createUser({ id: 'admin', role: Role.ADMIN });
		const event = await createEvent({ id: 'event-1', authorId: user.id, state: EventState.REFUSED });

		await expect(Events.findModel(admin, event.id)).resolves.toEqual(prepareEvent(event));
	});
	test('admin can not get draft event', async () => {
		const user = await createUser({ id: 'user-1' })
		const admin = await createUser({ id: 'admin', role: Role.ADMIN });
		const event = await createEvent({ id: 'event-1', authorId: user.id, state: EventState.DRAFT });

		await expect(Events.findModel(admin, event.id)).rejects.toEqual(new HTTP403Error('Not authorized'));
	});
	test('throws 404 if event not found', async () => {
		const user = await createUser({ id: 'user-1' })
		await expect(Events.findModel(user, 'event-1')).rejects.toEqual(
			new HTTP404Error('Event not found')
		);
	})
});

describe('updateEvent', () => {
	test('update DRAFT', async () => {
		const user = await createUser({ id: 'user-1' })
		const event = await createEvent({ id: 'event-1', authorId: user.id, state: EventState.DRAFT })


		await expect(Events.updateModel(user, event.id, { description: 'hello' })).resolves.toEqual(prepareEvent({
			...event,
			description: 'hello'
		}));
	});
	test('can add departments to a draft', async () => {
		const user = await createUser({ id: 'user-1' })
		const dep1 = await createDepartment({ id: 'dep-1' });
		const event = await createEvent({
			id: 'event-1',
			authorId: user.id,
			state: EventState.DRAFT,
			departments: {
				connect: [{ id: dep1.id }]
			}
		})
		expect(prepareEvent(event).departmentIds).toEqual([])

		await expect(Events.updateModel(user, event.id, { description: 'hello', departmentIds: [dep1.id] })).resolves.toEqual(prepareEvent({
			...event,
			description: 'hello',
			departments: [dep1],
		}));
	});
	test('can not update not existant event', async () => {
		const user = await createUser({ id: 'user-1' })

		await expect(Events.updateModel(user, 'event-1', {})).rejects.toEqual(
			new HTTP404Error('Event not found')
		);
	});
	test('can not update another users events', async () => {
		const user = await createUser({ id: 'user-1' })
		const event = await createEvent({ id: 'event-1', authorId: 'felix', state: EventState.DRAFT })


		await expect(Events.updateModel(user, 'event-1', { description: 'hello' })).rejects.toEqual(
			new HTTP403Error('Not authorized')
		);
	});

	test('update PUBLISHED creates a version', async () => {
		const user = await createUser({ id: 'user-1' })
		const event = await createEvent({ id: 'event-1', authorId: user.id, state: EventState.PUBLISHED, description: 'published' })


		await expect(Events.updateModel(user, 'event-1', { description: 'hello' })).resolves.toEqual(prepareEvent({
			...event,
			id: expect.any(String),
			state: EventState.DRAFT,
			createdAt: expect.any(Date),
			updatedAt: expect.any(Date),
			parentId: 'event-1',
			description: 'hello'
		}));
	});

	test('update PUBLISHED with departments creates a version', async () => {
		const user = await createUser({ id: 'user-1' })
		const department = await createDepartment({ id: 'dep-1' });
		const event = await createEvent({ id: 'event-1', authorId: user.id, state: EventState.PUBLISHED, description: 'published', departments: { connect: { id: department.id } } })

		await expect(Events.updateModel(user, 'event-1', { description: 'hello', departmentIds: [department.id] })).resolves.toEqual(prepareEvent({
			...event,
			id: expect.any(String),
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

	test('thorws on not found event', async () => {
		const user = await createUser({ id: 'user-1' })
		await expect(Events.setState(user, 'event-1', EventState.REVIEW)).rejects.toEqual(
			new HTTP404Error('Event not found')
		);
	});

	test('thorws when not the author', async () => {
		const user = await createUser({ id: 'user-1' })
		const malory = await createUser({ id: 'malory' })
		const event = await createEvent({authorId: user.id});

		await expect(Events.setState(malory, event.id, EventState.REVIEW)).rejects.toEqual(
			new HTTP403Error('Not authorized')
		);
	});

	test('DRAFT -> REVIEW', async () => {
		const user = await createUser({ id: 'user-1' })
		const event = await createEvent({ id: 'event-1', authorId: user.id, state: EventState.DRAFT })

		await expect(Events.setState(user, 'event-1', EventState.REVIEW)).resolves.toEqual({
			event: {
				/** expect the prepared event to be returned
				 * @see event.helpers.ts#prepareEvent 
				 */
				...event,
				state: EventState.REVIEW,
				author: undefined,
				departments: undefined,
				departmentIds: [],
				job: undefined,
				children: undefined,
				versionIds: []
			},
			affected: []
		});
	});

	test('DRAFT -> PUBLISHED', async () => {
		const user = await createUser({ id: 'user-1' })
		const event = await createEvent({ id: 'event-1', authorId: user.id, state: EventState.DRAFT })

		await expect(Events.setState(user, 'event-1', EventState.PUBLISHED)).rejects.toEqual(
			new HTTP400Error('Draft can only be set to review')
		);
	});

	test('DRAFT -> REFUSED', async () => {
		const user = await createUser({ id: 'user-1' })
		const event = await createEvent({ id: 'event-1', authorId: user.id, state: EventState.DRAFT })

		await expect(Events.setState(user, 'event-1', EventState.REFUSED)).rejects.toEqual(
			new HTTP400Error('Draft can only be set to review')
		);
	});

	test('REFUSED -> PUBLISHED', async () => {
		const user = await createUser({ id: 'user-1' })
		const event = await createEvent({ id: 'event-1', authorId: user.id, state: EventState.REFUSED })

		await expect(Events.setState(user, 'event-1', EventState.PUBLISHED)).rejects.toEqual(
			new HTTP400Error('REFUSED state is immutable')
		);
	});

	test('PUBLISHED -> REFUSED', async () => {
		const user = await createUser({ id: 'user-1' })
		const event = await createEvent({ id: 'event-1', authorId: user.id, state: EventState.PUBLISHED })

		await expect(Events.setState(user, 'event-1', EventState.REFUSED)).rejects.toEqual(
			new HTTP400Error('PUBLISHED state is immutable')
		);
	});

	test('versioned DRAFT -> REVIEW', async () => {
		const user = await createUser({ id: 'user-1' })
		const parent = await createEvent({ id: 'parent', authorId: user.id, state: EventState.PUBLISHED })
		const event = await createEvent({ id: 'child', authorId: user.id, state: EventState.DRAFT, parentId: parent.id })

		prismock.$queryRaw = jest.fn().mockResolvedValueOnce([{ id: parent.id, parent_id: null }]);

		/** expect the prepared event to be returned
		 * @see event.helpers.ts#prepareEvent 
		 */
		await expect(Events.setState(user, event.id, EventState.REVIEW)).resolves.toEqual({
			event: {
				...event,
				state: EventState.REVIEW,
				author: undefined,
				departments: undefined,
				departmentIds: [],
				job: undefined,
				children: undefined,
				versionIds: []
			},
			affected: []
		});
	});

	test('versioned DRAFT of old version -> REVIEW', async () => {
		const user = await createUser({ id: 'user-1' });
		const ancestor1 = await createEvent({ id: 'ancestor1', authorId: user.id, state: EventState.PUBLISHED });
		const ancestor2 = await createEvent({ id: 'ancestor2', authorId: user.id, state: EventState.PUBLISHED, parentId: ancestor1.id });
		const event = await createEvent({ id: 'child', authorId: user.id, state: EventState.DRAFT, parentId: ancestor2.id });

		prismock.$queryRaw = jest.fn().mockResolvedValueOnce([{ id: ancestor1.id, parent_id: null }]);

		/** expect the prepared event to be returned
		 * @see event.helpers.ts#prepareEvent 
		 */
		await expect(Events.setState(user, event.id, EventState.REVIEW)).resolves.toEqual({
			event: {
				...event,
				state: EventState.REVIEW,
				author: undefined,
				departments: undefined,
				departmentIds: [],
				job: undefined,
				children: undefined,
				parentId: ancestor1.id,
				versionIds: []
			},
			affected: []
		});
	});
	test('versioned REVIEW version -> PUBLISHED', async () => {
		const user = await createUser({ id: 'user-1' })
		const current = await createEvent({ id: 'ancestor1', authorId: user.id, description: 'hello', state: EventState.PUBLISHED })
		const nextCurrent = await createEvent({ id: 'child', authorId: user.id, description: 'fancy hello', state: EventState.REVIEW, parentId: current.id })
		const admin = await createUser({ id: 'admin', role: Role.ADMIN });
		await setTimeout(100);
		
		const newCurrent = {
			...nextCurrent,
			updatedAt: expect.any(Date),
			state: EventState.PUBLISHED,
			id: current.id,
			departments: undefined,
			departmentIds: [],
			children: undefined,
			parentId: null,
			versionIds: ['child']
		};

		const oldCurrent = {
			...current,
			id: nextCurrent.id,
			updatedAt: expect.any(Date),
			departmentIds: [],
			parentId: current.id,
			versionIds: []
		};

		await expect(Events.setState(admin, nextCurrent.id, EventState.PUBLISHED)).resolves.toEqual({
			event: oldCurrent,
			affected: [newCurrent]
		});
	});

});

describe('destroyEvent', () => {
	test('destroy DRAFT', async () => {
		const user = await createUser({ id: 'user-1' })
		const event = await createEvent({ id: 'event-1', authorId: user.id, state: EventState.DRAFT })

		await expect(Events.destroy(user, event.id)).resolves.toEqual(prepareEvent(event));
	});
	test('destroy REVIEW', async () => {
		const user = await createUser({ id: 'user-1' })
		const event = await createEvent({ id: 'event-1', authorId: user.id, state: EventState.REVIEW })

		await expect(Events.destroy(user, event.id)).resolves.toEqual(prepareEvent({
			...event,
			deletedAt: expect.any(Date)
		}));
	});
	test('destroy REFUSED', async () => {
		const user = await createUser({ id: 'user-1' })
		const event = await createEvent({ id: 'event-1', authorId: user.id, state: EventState.REFUSED })

		await expect(Events.destroy(user, event.id)).resolves.toEqual(prepareEvent({
			...event,
			deletedAt: expect.any(Date)
		}));
	});
	test('destroy PUBLISHED', async () => {
		const user = await createUser({ id: 'user-1' })
		const event = await createEvent({ id: 'event-1', authorId: user.id, state: EventState.PUBLISHED })

		await expect(Events.destroy(user, event.id)).resolves.toEqual(prepareEvent({
			...event,
			deletedAt: expect.any(Date)
		}));
	});

	test('user can not delete other users event', async () => {
		const user = await createUser({ id: 'user-1' })
		const malory = await createUser({ id: 'malory' })
		const event = await createEvent({ id: 'event-1', authorId: user.id, state: EventState.PUBLISHED })

		await expect(Events.destroy(malory, event.id)).rejects.toEqual(
			new HTTP403Error('Not authorized')
		);
	});
	test('admin can delete users event', async () => {
		const user = await createUser({ id: 'user-1' })
		const admin = await createUser({ id: 'malory', role: Role.ADMIN })
		const event = await createEvent({ id: 'event-1', authorId: user.id, state: EventState.PUBLISHED })

		await expect(Events.destroy(admin, event.id)).resolves.toEqual(prepareEvent({
			...event,
			deletedAt: expect.any(Date)
		}));
	});

});

describe('allEvents', () => {
	const setup = async () => {
		const maria = await createUser({ id: 'maria' });
		const jack = await createUser({ id: 'jack', role: Role.ADMIN });

		const pub1 = await createEvent({ id: 'pub-1', authorId: maria.id, state: EventState.PUBLISHED });
		const draft1 = await createEvent({ id: 'draft-1', authorId: maria.id, state: EventState.DRAFT });
		const refused1 = await createEvent({ id: 'refused-1', authorId: maria.id, state: EventState.REFUSED });
		const review1 = await createEvent({ id: 'review-1', authorId: maria.id, state: EventState.REVIEW });

		const pub2 = await createEvent({ id: 'pub-2', authorId: jack.id, state: EventState.PUBLISHED });
		const draft2 = await createEvent({ id: 'draft-2', authorId: jack.id, state: EventState.DRAFT });
		return { maria, jack, pub1, draft1, refused1, review1, pub2, draft2};
	};
	test('all published Events for anonyme user', async () => {
		const {pub1, pub2} = await setup();
		await expect(Events.all()).resolves.toEqual([
			prepareEvent(pub1),
			prepareEvent(pub2),
		]);
	});
	test('all published Events and the owned events for user', async () => {
		const {maria, pub1, draft1, refused1, review1, pub2 } = await setup();
		await expect(Events.all(maria)).resolves.toEqual([
			prepareEvent(pub1),
			prepareEvent(draft1),
			prepareEvent(refused1),
			prepareEvent(review1),
			prepareEvent(pub2),
		]);
	});
	test('all Published, Reviews, Refuesd and owned events for admin', async () => {
		const { jack, pub1, refused1, review1, pub2, draft2} = await setup();
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
		const reto = await createUser({ id: 'user-1' })
		const maria = await createUser({ id: 'user-2' })
		const event = await createEvent({ id: 'event-1', authorId: maria.id, state: EventState.PUBLISHED, createdAt: new Date(2021, 1, 1), updatedAt: new Date(2021, 1, 2) })

		const clone = await Events.cloneModel(reto, event.id);
		expect(clone).toHaveProperty('id', expect.any(String));
		expect(clone).not.toHaveProperty('createdAt', event.createdAt);
		expect(clone).not.toHaveProperty('updatedAt', event.updatedAt);
		expect(clone).toEqual(prepareEvent({
			...event,
			id: expect.not.stringMatching(event.id),
			authorId: reto.id,
			state: EventState.DRAFT,
			cloned: true,
			createdAt: expect.any(Date),
			updatedAt: expect.any(Date),
		}));
	});
	test('clone Event with departments', async () => {
		const reto = await await createUser({ id: 'user-1' })
		const maria = await await createUser({ id: 'user-1' })
		const dep1 = await createDepartment({ id: 'dep-1' });
		const dep2 = await createDepartment({ id: 'dep-2' });
		const event = await createEvent({
			id: 'event-1',
			authorId: maria.id,
			state: EventState.PUBLISHED,
			createdAt: new Date(2021, 1, 1),
			updatedAt: new Date(2021, 1, 2),
			departments: {
				connect: [{ id: dep1.id }, { id: dep2.id }]
			}
		})

		const clone = await Events.cloneModel(reto, event.id);
		expect(clone).toEqual(prepareEvent({
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