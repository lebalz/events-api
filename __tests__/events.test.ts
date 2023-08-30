import { prismaMock } from '../__mocks__/singleton'
import { Department, Event, EventState, Prisma, Role, TeachingAffected } from '@prisma/client'
import { getMockProps as getMockedUser } from './users.test';
import Events from '../src/models/event'
import { v4 as uuidv4 } from 'uuid';
import prisma from '../src/prisma';

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
    deletedAt: props.deletedAt as Date || null,
    departments: props.departments as Department[] || [],
    children: props.children as Event[] || [],
  }
}
test('returns event', async () => {
  const user = getMockedUser({ id: 'user-1' })
  const event = getMockProps('user-1', { id: 'event-1' })

  prismaMock.event.findUnique.mockImplementation(((args: { where: { id: string } }) => {
    if (args.where.id === event.id) {
      return event;
    }
    return null;
  }) as unknown as typeof prisma.event.findUnique);

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


describe('setState transitions', () => {
  const user = getMockedUser({ id: 'user-1' })
  const createMocks = (_events: Event[]) => {
    const events = _events.map(e => ({ ...e }));

    const handleRelations = (event: Event, include?: Prisma.EventInclude | null) => {
      const ret = { ...event }
      if (!include) {
        return ret
      };
      if (include.departments) {
        (ret as any).departments = [];
      }
      if (include.children) {
        (ret as any).children = events.filter(e => e.parentId === ret.id).map(e => ({ ...e }));
      }
      return ret;
    }
    /** mock update */
    prismaMock.event.update.mockImplementation(((args: Prisma.EventUpdateArgs) => {
      const idx = events.findIndex(e => e.id === args.where.id);
      Object.keys(args.data).forEach((key) => {
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
  }

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
      new Error('Draft can only be set to review')
    );
  });

  test('DRAFT -> REFUSED', async () => {
    const event = getMockProps('user-1', { id: 'event-1', state: EventState.DRAFT })
    createMocks([event]);

    await expect(Events.setState(user, 'event-1', EventState.REFUSED)).rejects.toEqual(
      new Error('Draft can only be set to review')
    );
  });

  test('REFUSED -> PUBLISHED', async () => {
    const event = getMockProps('user-1', { id: 'event-1', state: EventState.REFUSED })
    createMocks([event]);

    await expect(Events.setState(user, 'event-1', EventState.PUBLISHED)).rejects.toEqual(
      new Error('REFUSED state is immutable')
    );
  });

  test('PUBLISHED -> REFUSED', async () => {
    const event = getMockProps('user-1', { id: 'event-1', state: EventState.PUBLISHED })
    createMocks([event]);

    await expect(Events.setState(user, 'event-1', EventState.REFUSED)).rejects.toEqual(
      new Error('PUBLISHED state is immutable')
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

})