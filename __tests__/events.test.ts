import { prismaMock } from '../src/singleton'
import { Department, Event, EventState, Prisma, Role, TeachingAffected } from '@prisma/client'
import { find } from '../src/models/event'
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
  const event = getMockProps('user-1', { id: 'event-1' })

  prismaMock.event.findUnique.mockImplementation(((args: {where: {id: string}}) => {
    if (args.where.id === event.id) {
        return event;
    }
    return null;
}) as unknown as typeof prisma.event.findUnique);

  await expect(find('event-1')).resolves.toEqual({
    ...event,
    author: undefined,
    departments: undefined,
    departmentIds: [],
    jobId: undefined,
    job: undefined,
    versionIds: []
  });
})