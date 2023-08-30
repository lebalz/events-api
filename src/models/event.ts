import { Department, Event, EventState, Job, Prisma, PrismaClient, Role, User } from "@prisma/client";
import prisma from "../prisma";
import { createDataExtractor } from "../controllers/helpers";
import { ApiEvent, clonedProps, prepareEvent } from "./event.helpers";
const getData = createDataExtractor<Prisma.EventUncheckedUpdateInput>(
    [
        'klpOnly',
        'classes',
        'description',
        'teachersOnly',
        'start',
        'end',
        'location',
        'description',
        'classGroups',
        'userGroupId',
        'descriptionLong',
        'teachingAffected',
        'subjects'
    ]
);

function Events(prismaEvent: PrismaClient['event']) {
    return Object.assign(prismaEvent, {
        async findEvent(actor: User | undefined, id: string): Promise<ApiEvent | null> {
            const event = await prismaEvent.findUnique({
                where: { id: id },
                include: { departments: true, children: true },
            });
            if (!event) {
                throw new Error('Event not found');
            }
            if (event.state === EventState.PUBLISHED) {
                return prepareEvent(event);
            }
            if (actor?.id === event.authorId) {
                return prepareEvent(event);
            }
            if (actor?.role === Role.ADMIN && (
                event.state === EventState.REVIEW || 
                event.state === EventState.REFUSED)) {
                return prepareEvent(event);
            }
            throw new Error('Not authorized');
        },
        async updateEvent(actor: User, id: string, data: Prisma.EventUncheckedUpdateInput & { departmentIds?: string[]}): Promise<ApiEvent> {
            const record = await prismaEvent.findUnique({ where: { id: id }, include: { departments: true } });
            if (!record) {
                throw new Error('Event not found');
            }
            if (record.authorId !== actor.id && actor.role !== Role.ADMIN) {
                throw new Error('Not authorized');
            }
            /** remove fields not updatable*/
            const sanitized = getData(data);
            const departmentIds = data.departmentIds || [];

            let model: Event & {
                job: Job | null;
                departments: Department[];
                children: Event[];
            };
            /* DRAFT     --> update the fields */
            /* OTHERWIES --> create a linked clone and update the props there */
            if (record?.state === EventState.DRAFT) {
                model = await prismaEvent.update({
                    where: { id: id },
                    data: {
                        ...sanitized,
                        cloned: false,
                        departments: {
                            set: departmentIds.map((id) => ({ id }))
                        }
                    },
                    include: { job: true, departments: true, children: true },
                });
            } else {
                const cProps = clonedProps(record, actor.id, { cloneUserGroup: true });

                model = await prismaEvent.create({
                    data: {
                        ...cProps,
                        ...(sanitized as Prisma.EventUncheckedCreateInput),
                        parentId: record.id,
                        state: EventState.DRAFT,
                        departments: {
                            connect: departmentIds.map((id) => ({ id }))
                        }
                    },
                    include: { job: true, departments: true, children: true },
                });
            }
            return prepareEvent(model);
        },
        async setState(actor: User, id: string, requested: EventState): Promise<ApiEvent> {
            const isAdmin = actor!.role === Role.ADMIN;
            const record = await prismaEvent.findUnique({ where: { id: id }, include: { departments: true, children: true } });
            if (!record || (record.authorId !== actor.id && !isAdmin)) {
                throw new Error('Not authorized');
            }
            
            const updater = () => prismaEvent.update({
                where: { id: id },
                data: {
                    state: requested
                },
                include: { departments: true, children: true },
            });

            switch (record.state) {
                case EventState.DRAFT:
                    if (EventState.REVIEW === requested) {
                        if (record.parentId) {
                            /* ensure that the parent is the current published version. Otherwise set 
                            /  the parent_id to the first ancestor */
                            const publishedParent = await prisma.$queryRaw<Event[]>(Prisma.sql`
                                WITH RECURSIVE tree as (
                                    -- start with the requested event
                                    SELECT id, parent_id
                                    FROM events
                                    WHERE id = ${record.id}::uuid
                                    
                                    UNION
                                    -- recursively select all ancestors
                                    SELECT e.id, e.parent_id
                                    FROM events e
                                    INNER JOIN tree
                                    ON e.id=tree.parent_id
                                ) -- get first ancestor 
                                SELECT * FROM tree WHERE parent_id IS NULL LIMIT 1;
                            `);

                            if (publishedParent.length < 1) {
                                throw new Error('Parent not found');
                            }
                            const model = await prismaEvent.update({
                                where: { id: record.id },
                                data: {
                                    state: requested,
                                    parentId: publishedParent[0].id
                                },
                                include: { departments: true, children: true }
                            });
                            return prepareEvent(model);
                        } else {
                            const model = await updater();
                            return prepareEvent(model);
                        }
                    }
                    throw new Error('Draft can only be set to review');
                case EventState.REVIEW:
                    if (!isAdmin) {
                        throw new Error('Not authorized');
                    }
                    if (record.parentId && EventState.PUBLISHED === requested) {
                        const parent = await prismaEvent.findUnique({ where: { id: record.parentId }, include: { departments: true, children: true } });
                        if (!parent) {
                            throw new Error('Parent not found');
                        } else if (!!parent.parentId) {
                            throw new Error('Parent must be the current published version');
                        }
                        const siblings = await prismaEvent.findMany({ where: { AND: [{parentId: parent.id}, {NOT: {id: record.id}}] } });
                        const result = await prisma.$transaction([
                            /** swap the child and the parent - ensures that the uuid for the ical stays the same  */
                            prismaEvent.update({
                                where: { id: parent.id },
                                data: {
                                    ...clonedProps(record, record.authorId, {full: true}),
                                    state: requested
                                },
                                include: { departments: true, children: true },
                            }),
                            prismaEvent.update({
                                where: { id: record.id },
                                data: {
                                    ...clonedProps(parent, parent.authorId, {full: true}),
                                }
                            }),
                            /** ensure that all pending reviews with this parent are refused... */
                            prismaEvent.updateMany({
                                where: { AND: [{ id: { in: siblings.map((s) => s.id) }}, { state: EventState.REVIEW }] },
                                data: {
                                    state: EventState.REFUSED
                                }
                            })
                        ]);
                        return prepareEvent(result[0]);
                    } else if (EventState.PUBLISHED === requested || EventState.REFUSED === requested) {
                        const model = await updater();
                        return prepareEvent(model);
                    }
                    throw new Error('Review can only be set to Published or to Refused');
                case EventState.PUBLISHED:
                case EventState.REFUSED:
                    /** can't do anything with it */
                    throw new Error(`${record.state} state is immutable`);
            }
            throw new Error(`Unknown state "${requested}" requested`);
        }
    });
}

export default Events(prisma.event);