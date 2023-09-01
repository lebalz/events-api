import { prismaMock } from '../__mocks__/singleton'
import { Department, Event, EventState, Prisma, Role, TeachingAffected } from '@prisma/client'
import { getMockProps as getMockedUser } from './users.test';
import { getMockProps as getMockedDepartment } from './departments.test';
import Events from '../src/models/event'
import { v4 as uuidv4 } from 'uuid';
import prisma from '../src/prisma';
import { prepareEvent } from '../src/models/event.helpers';
import { HTTP400Error, HTTP403Error, HTTP404Error } from '../src/utils/errors/Errors';

export const getMockProps = (authorId: string, props: Partial<Prisma.EventUncheckedCreateInput>) => {
	return {
		id: props.id || uuidv4(),
		authorId: authorId,
		cloned: props.cloned || false,
		description: props.description || '',
		descriptionLong: props.descriptionLong || '',
		start: props.start as Date || new Date(),
		end: props.end as Date || new Date(),
		klpOnly: props.klpOnly || false,
		location: props.location || '',
		parentId: props.parentId || null,
		state: props.state || EventState.DRAFT,
		teachersOnly: props.teachersOnly || false,
		teachingAffected: props.teachingAffected || TeachingAffected.NO,
		userGroupId: props.userGroupId || null,
		classes: props.classes as string[] || [],
		classGroups: props.classGroups as string[] || [],
		subjects: props.subjects as string[] || [],
		jobId: props.jobId || null,
		createdAt: props.createdAt as Date || new Date(),
		updatedAt: props.updatedAt as Date || new Date(),
		deletedAt: props.deletedAt as Date || null
	}
}

const createMocks = (_events: Event[], _departments?: Department[], _event2department?: [string, string[]][]) => {
	const events = _events.map(e => ({ ...e }));
	const departments = _departments?.map(d => ({ ...d })) || [];
	const event2department = new Map<string, string[]>(_event2department || []);

	const handleRelations = (event: Event, include?: Prisma.EventInclude | null) => {
		const ret = { ...event }
		if (!include) {
			return ret
		};
		if (include.departments) {
			if (event2department.has(event.id)) {
				(ret as any).departments = event2department.get(event.id)!	/** get department ids */
					.map(d => departments.find((p) => d === p.id))			/** find department */
					.filter(d => !!d) 										/** filter not found departments */
					.map((d) => ({ ...d })); 								/** clone department */
			} else {
				(ret as any).departments = [];
			}
		}
		if (include.children) {
			(ret as any).children = events.filter(e => e.parentId === ret.id).map(e => ({ ...e }));
		}
		return ret;
	}
	/** mock update */
	prismaMock.event.update.mockImplementation(((args: Prisma.EventUpdateArgs) => {
		if (!args.where.id) {
			throw new Error('Missing id');
		}
		const idx = events.findIndex(e => e.id === args.where.id);

		(Object.keys(args.data) as (keyof typeof args.data)[]).forEach((key) => {
			if (key === 'departments') {
				if (args.data[key]?.connect || args.data[key]?.set) {
					const connect = (args.data[key]!.connect || args.data[key]?.set) as Prisma.DepartmentWhereUniqueInput[];
					event2department.set(args.where.id!, connect.map((d) => (d as { id: string }).id));
				} else {
					throw new Error(`Not implemented: ${JSON.stringify(args.data.departments)}`);
				}
			}
			(events[idx] as any)[key] = (args.data as any)[key];
		});
		return handleRelations(events[idx], args.include);
	}) as unknown as typeof prisma.event.update);

	/** mock find event */
	prismaMock.event.findUnique.mockImplementation(((args: Prisma.EventFindUniqueArgs) => {
		const event = events.find(e => e.id === args.where.id);
		if (event) {
			return handleRelations(event, args.include);
		}
		return null;
	}) as unknown as typeof prisma.event.findUnique);

	/** mock delete event */
	prismaMock.event.delete.mockImplementation(((args: Prisma.EventDeleteArgs) => {
		const idx = events.findIndex(e => e.id === args.where.id);
		if (idx >= 0) {
			const event = events.splice(idx, 1)[0];
			return handleRelations(event, args.include);
		}
		return null;
	}) as unknown as typeof prisma.event.delete);

	/** mock create event */
	prismaMock.event.create.mockImplementation(((args: Prisma.EventCreateArgs) => {
		const id = args.data.id || `event-${events.length + 1}`
		const event = events.find(e => e.id === id);
		if (event) {
			throw new Error('Event already exists');
		}
		const newEvent = getMockProps(args.data.authorId || 'unknown', { ...args.data, id: id });
		events.push(newEvent);
		
		if (args.data.departments?.connect) {
			const connect = args.data.departments.connect as Prisma.DepartmentWhereUniqueInput[];
			event2department.set(id, connect.map((d) => (d as { id: string }).id));
		} else {
			throw new Error(`Not implemented: ${JSON.stringify(args.data.departments)}`);
		}
		return handleRelations(newEvent, args.include);
	}) as unknown as typeof prisma.event.create);

	/** mock findMany event */
	prismaMock.event.findMany.mockImplementation(((args: Prisma.EventFindManyArgs) => {
		const isIncluded = (e: Event, whereArgs: Prisma.EventWhereInput): boolean => {
			let isIn = true;
			Object.keys(whereArgs).forEach((key) => {
				if (isIn && key in e) {
					if ((e as any)[key] !== (whereArgs as any)[key]) {
						isIn = false;
					}
				}
			});
			if (!isIn) {
				return false;
			}
			if (whereArgs.OR) {
				isIn = whereArgs.OR.some((or) => isIncluded(e, or));
				return isIn;
			}
			if (whereArgs.AND) {
				const whereArgsAND = whereArgs.AND as Prisma.EventWhereInput[];
				isIn = whereArgsAND.every((and) => isIncluded(e, and));
				return isIn;
			}
			if (whereArgs.NOT) {
				const whereArgsNOT = whereArgs.NOT as Prisma.EventWhereInput[];
				isIn = whereArgsNOT.every((not) => isIncluded(e, not));
				return isIn;
			}
			return true;
		};

		const ret = events.filter(u => {
			if (args.where) {
				return isIncluded(u, args.where);
			}
			return true;
		});
		return ret.map(e => handleRelations(e, args.include));
	}) as unknown as typeof prisma.event.findMany);
}

describe('find event', () => {
	test('returns event', async () => {
		const user = getMockedUser({ id: 'user-1' })
		const event = getMockProps('user-1', { id: 'event-1' })
		createMocks([event]);

		await expect(Events.findEvent(user, 'event-1')).resolves.toEqual({
			/** expect the prepared event to be returned
			 * @see event.helpers.ts#prepareEvent 
			 */
			...event,
			author: undefined,
			departments: undefined,
			departmentIds: [],
			jobId: null,
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
		await expect(Events.findEvent(admin, event.id)).resolves.toEqual(prepareEvent(event));
	});
	test('admin can get refused event', async () => {
		const user = getMockedUser({ id: 'user-1' })
		const admin = getMockedUser({ id: 'admin', role: Role.ADMIN });
		const event = getMockProps(user.id, { id: 'event-1', state: EventState.REFUSED });
		createMocks([event]);
		await expect(Events.findEvent(admin, event.id)).resolves.toEqual(prepareEvent(event));
	});
	test('admin can not get draft event', async () => {
		const user = getMockedUser({ id: 'user-1' })
		const admin = getMockedUser({ id: 'admin', role: Role.ADMIN });
		const event = getMockProps(user.id, { id: 'event-1', state: EventState.DRAFT });
		createMocks([event]);
		await expect(Events.findEvent(admin, event.id)).rejects.toEqual(new HTTP403Error('Not authorized'));
	});
	test ('throws 404 if event not found', async () => {
		const user = getMockedUser({ id: 'user-1' })
		await expect(Events.findEvent(user, 'event-1')).rejects.toEqual(
			new HTTP404Error('Event not found')
		);
	})
});

describe('updateEvent', () => {
	test('update DRAFT', async () => {
		const user = getMockedUser({ id: 'user-1' })
		const event = getMockProps(user.id, { id: 'event-1', state: EventState.DRAFT })
		createMocks([event]);

		await expect(Events.updateEvent(user, event.id, { description: 'hello' })).resolves.toEqual(prepareEvent({
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

		await expect(Events.updateEvent(user, event.id, { description: 'hello', departmentIds: [dep1.id] })).resolves.toEqual(prepareEvent({
			...event,
			description: 'hello',
			departments: [dep1],
		}));
	});
	test('can not update not existant event', async () => {
		const user = getMockedUser({ id: 'user-1' })

		await expect(Events.updateEvent(user, 'event-1', {})).rejects.toEqual(
			new HTTP404Error('Event not found')
		);
	});
	test('can not update another users events', async () => {
		const user = getMockedUser({ id: 'user-1' })
		const event = getMockProps('felix', { id: 'event-1', state: EventState.DRAFT })
		createMocks([event]);

		await expect(Events.updateEvent(user, 'event-1', { description: 'hello' })).rejects.toEqual(
			new HTTP403Error('Not authorized')
		);
	});

	test('update PUBLISHED creates a version', async () => {
		const user = getMockedUser({ id: 'user-1' })
		const event = getMockProps(user.id, { id: 'event-1', state: EventState.PUBLISHED, description: 'published' })
		createMocks([event]);

		await expect(Events.updateEvent(user, 'event-1', { description: 'hello' })).resolves.toEqual(prepareEvent({
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

		await expect(Events.updateEvent(user, 'event-1', { description: 'hello', departmentIds: [department.id]})).resolves.toEqual(prepareEvent({
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
			jobId: null,
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
			jobId: null,
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
			jobId: null,
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
			jobId: null,
			job: undefined,
			children: undefined,
			parentId: null,
			versionIds: ['child']
		});
		await expect(Events.findEvent(user, event.id)).resolves.toEqual({
			...ancestor1,
			id: event.id,
			author: undefined,
			departments: undefined,
			departmentIds: [],
			jobId: null,
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
		const clone = Events.cloneEvent(reto, event.id);
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

		const clone = Events.cloneEvent(reto, event.id);
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