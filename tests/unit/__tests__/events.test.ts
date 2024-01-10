import { EventState, Prisma, Role } from '@prisma/client'
import { createDepartment } from './departments.test';
import Events from '../../../src/models/events'
import { prepareEvent } from '../../../src/models/event.helpers';
import { HTTP400Error, HTTP403Error, HTTP404Error } from '../../../src/utils/errors/Errors';
import prisma from '../../../src/prisma';
import { createUser } from './users.test';
import { generateEvent } from '../../factories/event';
import { setTimeout } from 'timers/promises';
import _ from 'lodash';

export const createEvent = async (props: (Partial<Prisma.EventUncheckedCreateInput> & {authorId: string})) => {
	return await prisma.event.create({
		data: generateEvent(props)
	});
}

describe('find event', () => {
	test('returns event', async () => {
		const user = await createUser({ id: 'd40f9b00-c6de-4a36-b976-a4218c22b599' })
		const event = await createEvent({ id: 'a3ab1beb-34df-4fd1-8b3a-b96af77dd722', authorId: user.id })

		await expect(Events.findModel(user, 'a3ab1beb-34df-4fd1-8b3a-b96af77dd722')).resolves.toEqual({
			/** expect the prepared event to be returned
			 * @see event.helpers.ts#prepareEvent 
			 */
			...event,
			author: undefined,
			departments: undefined,
			departmentIds: [],
			job: undefined,
			children: undefined,
			publishedVersionIds: []
		});
	});
	test('admin can get review event', async () => {
		const user = await createUser({})
		const admin = await createUser({ role: Role.ADMIN });
		const event = await createEvent({ authorId: user.id, state: EventState.REVIEW });
		await expect(Events.findModel(admin, event.id)).resolves.toEqual(prepareEvent(event));
	});
	test('admin can get refused event', async () => {
		const user = await createUser({ })
		const admin = await createUser({ role: Role.ADMIN });
		const event = await createEvent({ authorId: user.id, state: EventState.REFUSED });

		await expect(Events.findModel(admin, event.id)).resolves.toEqual(prepareEvent(event));
	});
	test('admin can not get draft event', async () => {
		const user = await createUser({})
		const admin = await createUser({role: Role.ADMIN });
		const event = await createEvent({authorId: user.id, state: EventState.DRAFT });

		await expect(Events.findModel(admin, event.id)).rejects.toEqual(new HTTP403Error('Not authorized'));
	});
	test('throws 404 if event not found', async () => {
		const user = await createUser({})
		await expect(Events.findModel(user, '7cf72375-4ee7-4a13-afeb-8d68883acdf4')).rejects.toEqual(
			new HTTP404Error('Event not found')
		);
	})
});

describe('updateEvent', () => {
	test('update DRAFT', async () => {
		const user = await createUser({})
		const event = await createEvent({authorId: user.id, state: EventState.DRAFT })


		await expect(Events.updateModel(user, event.id, { description: 'hello' })).resolves.toEqual(prepareEvent({
			...event,
			description: 'hello',
			updatedAt: expect.any(Date)
		}));
	});
	test('can add departments to a draft', async () => {
		const user = await createUser({})
		const dep1 = await createDepartment({});
		const event = await createEvent({
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
			updatedAt: expect.any(Date)
		}));
	});
	test('can not update not existant event', async () => {
		const user = await createUser({})

		await expect(Events.updateModel(user, '7cf72375-4ee7-4a13-afeb-8d68883acdf4', {})).rejects.toEqual(
			new HTTP404Error('Event not found')
		);
	});
	test('can not update another users events', async () => {
		const user = await createUser({ });
		const malory = await createUser({ });
		const event = await createEvent({ authorId: user.id, state: EventState.DRAFT })


		await expect(Events.updateModel(malory, event.id, { description: 'hello' })).rejects.toEqual(
			new HTTP403Error('Not authorized')
		);
	});

	test('update PUBLISHED creates a version', async () => {
		const user = await createUser({})
		const event = await createEvent({authorId: user.id, state: EventState.PUBLISHED, description: 'published' })


		await expect(Events.updateModel(user, event.id, { description: 'hello' })).resolves.toEqual(prepareEvent({
			...event,
			id: expect.any(String),
			state: EventState.DRAFT,
			createdAt: expect.any(Date),
			updatedAt: expect.any(Date),
			parentId: event.id,
			description: 'hello'
		}));
	});

	test('update PUBLISHED with departments creates a version', async () => {
		const user = await createUser({ id: '3535b2ee-806f-425c-a4f5-394d8b16f6f9' })
		const department = await createDepartment({ id: 'ed588f55-0e3b-425c-8adf-87cb15b80ac2' });
		const event = await createEvent({ id: '7cf72375-4ee7-4a13-afeb-8d68883acdf4', authorId: user.id, state: EventState.PUBLISHED, description: 'published', departments: { connect: { id: department.id } } })

		await expect(Events.updateModel(user, '7cf72375-4ee7-4a13-afeb-8d68883acdf4', { description: 'hello', departmentIds: [department.id] })).resolves.toEqual(prepareEvent({
			...event,
			id: expect.any(String),
			state: EventState.DRAFT,
			createdAt: expect.any(Date),
			updatedAt: expect.any(Date),
			parentId: '7cf72375-4ee7-4a13-afeb-8d68883acdf4',
			description: 'hello',
			departments: [department]
		}));
	});
});

describe('setState transitions', () => {

	test('thorws on not found event', async () => {
		const user = await createUser({ id: '3535b2ee-806f-425c-a4f5-394d8b16f6f9' })
		await expect(Events.setState(user, '7cf72375-4ee7-4a13-afeb-8d68883acdf4', EventState.REVIEW)).rejects.toEqual(
			new HTTP404Error('Event not found')
		);
	});

	test('thorws when not the author', async () => {
		const user = await createUser({ id: '3535b2ee-806f-425c-a4f5-394d8b16f6f9' })
		const malory = await createUser({ id: 'e470e2cf-2a8c-453a-92d8-e04d21ea1547' })
		const event = await createEvent({authorId: user.id});

		await expect(Events.setState(malory, event.id, EventState.REVIEW)).rejects.toEqual(
			new HTTP403Error('Not authorized')
		);
	});

	test('DRAFT -> REVIEW', async () => {
		const user = await createUser({ id: '3535b2ee-806f-425c-a4f5-394d8b16f6f9' })
		const event = await createEvent({ id: '7cf72375-4ee7-4a13-afeb-8d68883acdf4', authorId: user.id, state: EventState.DRAFT })

		await expect(Events.setState(user, '7cf72375-4ee7-4a13-afeb-8d68883acdf4', EventState.REVIEW)).resolves.toEqual({
			event: {
				/** expect the prepared event to be returned
				 * @see event.helpers.ts#prepareEvent 
				 */
				...event,
				state: EventState.REVIEW,
				departmentIds: [],
				publishedVersionIds: [],
				updatedAt: expect.any(Date)
			},
			affected: []
		});
	});

	test('DRAFT -> PUBLISHED', async () => {
		const user = await createUser({ id: '3535b2ee-806f-425c-a4f5-394d8b16f6f9' })
		const event = await createEvent({ id: '7cf72375-4ee7-4a13-afeb-8d68883acdf4', authorId: user.id, state: EventState.DRAFT })

		await expect(Events.setState(user, '7cf72375-4ee7-4a13-afeb-8d68883acdf4', EventState.PUBLISHED)).rejects.toEqual(
			new HTTP400Error('Draft can only be set to review')
		);
	});

	test('DRAFT -> REFUSED', async () => {
		const user = await createUser({ id: '3535b2ee-806f-425c-a4f5-394d8b16f6f9' })
		const event = await createEvent({ id: '7cf72375-4ee7-4a13-afeb-8d68883acdf4', authorId: user.id, state: EventState.DRAFT })

		await expect(Events.setState(user, '7cf72375-4ee7-4a13-afeb-8d68883acdf4', EventState.REFUSED)).rejects.toEqual(
			new HTTP400Error('Draft can only be set to review')
		);
	});

	test('REFUSED -> PUBLISHED', async () => {
		const user = await createUser({ id: '3535b2ee-806f-425c-a4f5-394d8b16f6f9' })
		const event = await createEvent({ id: '7cf72375-4ee7-4a13-afeb-8d68883acdf4', authorId: user.id, state: EventState.REFUSED })

		await expect(Events.setState(user, '7cf72375-4ee7-4a13-afeb-8d68883acdf4', EventState.PUBLISHED)).rejects.toEqual(
			new HTTP400Error('REFUSED state is immutable')
		);
	});

	test('PUBLISHED -> REFUSED', async () => {
		const user = await createUser({ id: '3535b2ee-806f-425c-a4f5-394d8b16f6f9' })
		const event = await createEvent({ id: '7cf72375-4ee7-4a13-afeb-8d68883acdf4', authorId: user.id, state: EventState.PUBLISHED })

		await expect(Events.setState(user, '7cf72375-4ee7-4a13-afeb-8d68883acdf4', EventState.REFUSED)).rejects.toEqual(
			new HTTP400Error('PUBLISHED state is immutable')
		);
	});

	test('versioned DRAFT -> REVIEW', async () => {
		const user = await createUser({ id: '3535b2ee-806f-425c-a4f5-394d8b16f6f9' })
		const parent = await createEvent({ id: '85858beb-1a47-45cd-9c3f-e89834064e2a', authorId: user.id, state: EventState.PUBLISHED })
		const event = await createEvent({ id: '0755243d-10b4-4450-a239-30478df36b71', authorId: user.id, state: EventState.DRAFT, parentId: parent.id })

		/** expect the prepared event to be returned
		 * @see event.helpers.ts#prepareEvent 
		 */
		await expect(Events.setState(user, event.id, EventState.REVIEW)).resolves.toEqual({
			event: {
				...event,
				state: EventState.REVIEW,
				departmentIds: [],
				publishedVersionIds: [],
				updatedAt: expect.any(Date)
			},
			affected: []
		});
	});

	test('versioned DRAFT of old version -> REVIEW', async () => {
		const user = await createUser({ id: '3535b2ee-806f-425c-a4f5-394d8b16f6f9' });
		const ancestor1 = await createEvent({ id: 'e1a38f26-8da7-43b4-be5d-49ee81d20490', authorId: user.id, state: EventState.PUBLISHED });
		const ancestor2 = await createEvent({ id: 'b026edeb-819b-42e0-bd5f-e3d897b8e7ab', authorId: user.id, state: EventState.PUBLISHED, parentId: ancestor1.id });
		const event = await createEvent({ id: 'b793261c-b6cd-4d4d-94d0-7bffbc671a76', authorId: user.id, state: EventState.DRAFT, parentId: ancestor2.id });

		/** expect the prepared event to be returned
		 * @see event.helpers.ts#prepareEvent 
		 */
		await expect(Events.setState(user, event.id, EventState.REVIEW)).resolves.toEqual({
			event: {
				...event,
				state: EventState.REVIEW,
				departmentIds: [],
				parentId: ancestor1.id,
				publishedVersionIds: [],
				updatedAt: expect.any(Date)
			},
			affected: []
		});
	});
	test('versioned REVIEW version -> PUBLISHED', async () => {
		const user = await createUser({ id: '3535b2ee-806f-425c-a4f5-394d8b16f6f9' })
		const current = await createEvent({ id: 'edbef86b-c527-4fda-aaa0-b4638618dde3', authorId: user.id, description: 'hello', state: EventState.PUBLISHED })
		const nextCurrent = await createEvent({ id: '0c9a59a4-0be9-40a8-80bc-b5a9c228166d', authorId: user.id, description: 'fancy hello', state: EventState.REVIEW, parentId: current.id })
		const admin = await createUser({ id: '1dc09750-e026-4f81-923f-0d50202297c7', role: Role.ADMIN });
		await setTimeout(100);
		
		const newCurrent = {
			...nextCurrent,
			id: current.id,
			updatedAt: expect.any(Date),
			state: EventState.PUBLISHED,
			departments: undefined,
			departmentIds: [],
			children: undefined,
			parentId: null,
			publishedVersionIds: [nextCurrent.id]
		};

		const oldCurrent = {
			...current,
			id: nextCurrent.id,
			updatedAt: expect.any(Date),
			departmentIds: [],
			parentId: current.id,
			publishedVersionIds: []
		};
		const result = await Events.setState(admin, nextCurrent.id, EventState.PUBLISHED);
		await expect(result).toEqual({
			event: oldCurrent,
			affected: [newCurrent]
		});
	});

});

describe('destroyEvent', () => {
	test('destroy DRAFT', async () => {
		const user = await createUser({ id: '3535b2ee-806f-425c-a4f5-394d8b16f6f9' })
		const event = await createEvent({ id: '7cf72375-4ee7-4a13-afeb-8d68883acdf4', authorId: user.id, state: EventState.DRAFT })

		await expect(Events.destroy(user, event.id)).resolves.toEqual(prepareEvent(event));
	});
	test('destroy REVIEW', async () => {
		const user = await createUser({ id: '3535b2ee-806f-425c-a4f5-394d8b16f6f9' })
		const event = await createEvent({ id: '7cf72375-4ee7-4a13-afeb-8d68883acdf4', authorId: user.id, state: EventState.REVIEW })

		await expect(Events.destroy(user, event.id)).resolves.toEqual(prepareEvent({
			...event,
			deletedAt: expect.any(Date),
			updatedAt: expect.any(Date)
		}));
	});
	test('destroy REFUSED', async () => {
		const user = await createUser({ id: '3535b2ee-806f-425c-a4f5-394d8b16f6f9' })
		const event = await createEvent({ id: '7cf72375-4ee7-4a13-afeb-8d68883acdf4', authorId: user.id, state: EventState.REFUSED })

		await expect(Events.destroy(user, event.id)).resolves.toEqual(prepareEvent({
			...event,
			deletedAt: expect.any(Date),
			updatedAt: expect.any(Date)
		}));
	});
	test('destroy PUBLISHED', async () => {
		const user = await createUser({ id: '3535b2ee-806f-425c-a4f5-394d8b16f6f9' })
		const event = await createEvent({ id: '7cf72375-4ee7-4a13-afeb-8d68883acdf4', authorId: user.id, state: EventState.PUBLISHED })

		await expect(Events.destroy(user, event.id)).resolves.toEqual(prepareEvent({
			...event,
			deletedAt: expect.any(Date),
			updatedAt: expect.any(Date)
		}));
	});

	test('user can not delete other users event', async () => {
		const user = await createUser({ id: '3535b2ee-806f-425c-a4f5-394d8b16f6f9' })
		const malory = await createUser({ id: '10f61d90-22dd-495d-80b0-76f50f8bd3eb' })
		const event = await createEvent({ id: '7cf72375-4ee7-4a13-afeb-8d68883acdf4', authorId: user.id, state: EventState.PUBLISHED })

		await expect(Events.destroy(malory, event.id)).rejects.toEqual(
			new HTTP403Error('Not authorized')
		);
	});
	test('admin can delete users event', async () => {
		const user = await createUser({ id: '3535b2ee-806f-425c-a4f5-394d8b16f6f9' })
		const admin = await createUser({ id: 'ccccbd50-99ee-4e75-bb83-d6517ea604b2', role: Role.ADMIN })
		const event = await createEvent({ id: '7cf72375-4ee7-4a13-afeb-8d68883acdf4', authorId: user.id, state: EventState.PUBLISHED })

		await expect(Events.destroy(admin, event.id)).resolves.toEqual(prepareEvent({
			...event,
			deletedAt: expect.any(Date),
			updatedAt: expect.any(Date)
		}));
	});

});

describe('allEvents', () => {
	const setup = async () => {
		const maria = await createUser({});
		const jack = await createUser({role: Role.ADMIN });

		const pub1 = await createEvent({ start: new Date('2023-12-01'), authorId: maria.id, state: EventState.PUBLISHED });
		const draft1 = await createEvent({  start: new Date('2023-12-02'), authorId: maria.id, state: EventState.DRAFT });
		const refused1 = await createEvent({ start: new Date('2023-12-03'), authorId: maria.id, state: EventState.REFUSED });
		const review1 = await createEvent({ start: new Date('2023-12-04'), authorId: maria.id, state: EventState.REVIEW });

		const pub2 = await createEvent({ start: new Date('2023-12-29'), authorId: jack.id, state: EventState.PUBLISHED });
		const draft2 = await createEvent({ start: new Date('2023-12-30'), authorId: jack.id, state: EventState.DRAFT });
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
		const reto = await createUser({ id: '3535b2ee-806f-425c-a4f5-394d8b16f6f9' })
		const maria = await createUser({ id: '8b2774ad-a9e7-4e49-850b-8a36ed6cef0a' })
		const event = await createEvent({ id: '7cf72375-4ee7-4a13-afeb-8d68883acdf4', authorId: maria.id, state: EventState.PUBLISHED, createdAt: new Date(2021, 1, 1), updatedAt: new Date(2021, 1, 2) })

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
		const reto = await await createUser({ id: '3535b2ee-806f-425c-a4f5-394d8b16f6f9' })
		const maria = await await createUser({ id: 'b48d8aa1-e83b-4e02-b01b-7f06cc188c99' })
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