import { Department, Event, EventState, Job, JobState, JobType, Prisma, PrismaClient, Role, User } from "@prisma/client";
import prisma from "../prisma";
import { createDataExtractor } from "../controllers/helpers";
import { ApiEvent, clonedProps, prepareEvent } from "./event.helpers";
import { HTTP400Error, HTTP403Error, HTTP404Error } from "../utils/errors/Errors";
import { importExcel } from "../services/importExcel";
import Logger from "../utils/logger";
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

type AllEventQueryCondition = ({ state: EventState } | { authorId: string })[];

function Events(prismaEvent: PrismaClient['event']) {
    return Object.assign(prismaEvent, {
        async findEvent(actor: User | undefined, id: string): Promise<ApiEvent | null> {
            const event = await prismaEvent.findUnique({
                where: { id: id },
                include: { departments: true, children: true },
            });
            if (!event) {
                throw new HTTP404Error('Event not found');
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
            throw new HTTP403Error('Not authorized');
        },
        async updateEvent(actor: User, id: string, data: Prisma.EventUncheckedUpdateInput & { departmentIds?: string[]}): Promise<ApiEvent> {
            const record = await prismaEvent.findUnique({ where: { id: id }, include: { departments: true } });
            if (!record) {
                throw new HTTP404Error('Event not found');
            }
            if (record.authorId !== actor.id && actor.role !== Role.ADMIN) {
                throw new HTTP403Error('Not authorized');
            }
            /** remove fields not updatable*/
            const sanitized = getData(data);
            const departmentIds = data.departmentIds || [];

            let model: Event & {
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
                    include: { departments: true, children: true },
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
                    include: { departments: true, children: true },
                });
            }
            return prepareEvent(model);
        },
        async setState(actor: User, id: string, requested: EventState): Promise<ApiEvent> {
            const isAdmin = actor!.role === Role.ADMIN;
            const record = await prismaEvent.findUnique({ where: { id: id }, include: { departments: true, children: true } });
            if (!record || (record.authorId !== actor.id && !isAdmin)) {
                throw new HTTP403Error('Not authorized');
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
                                throw new HTTP404Error('Parent not found');
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
                    throw new HTTP400Error('Draft can only be set to review');
                case EventState.REVIEW:
                    if (!isAdmin) {
                        throw new HTTP403Error('Not authorized');
                    }
                    if (record.parentId && EventState.PUBLISHED === requested) {
                        const parent = await prismaEvent.findUnique({ where: { id: record.parentId }, include: { departments: true, children: true } });
                        if (!parent) {
                            throw new HTTP404Error('Parent not found');
                        } else if (!!parent.parentId) {
                            throw new HTTP400Error('Parent must be the current published version');
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
                    throw new HTTP400Error('Review can only be set to Published or to Refused');
                case EventState.PUBLISHED:
                case EventState.REFUSED:
                    /** can't do anything with it */
                    throw new HTTP400Error(`${record.state} state is immutable`);
            }
            throw new HTTP400Error(`Unknown state "${requested}" requested`);
        },
        async destroy(actor: User, id: string): Promise<ApiEvent> {
            const record = await prismaEvent.findUnique({ where: { id: id } });
            /** check policy - only delete if user is author or admin */
            if (!record) {
                throw new HTTP404Error('Event not found');
            }
            if (record.authorId !== actor.id && actor.role !== Role.ADMIN) {
                throw new HTTP403Error('Not authorized');
            }
            /** only drafts are allowed to be hard deleted */
            if (record.state === EventState.DRAFT) {
                const model = await prismaEvent.delete({
                    where: {
                        id: record.id,
                    },
                    include: { departments: true, children: true },
                });
                return prepareEvent(model);
            }
            const model = await prismaEvent.update({
                where: {
                    id: record.id,
                },
                data: {
                    deletedAt: new Date()
                },
                include: { departments: true, children: true },
            });
            return prepareEvent(model);
        },
        async all(actor?: User | undefined): Promise<ApiEvent[]> {
            const condition: AllEventQueryCondition = [];
            if (actor) {
                condition.push({ authorId: actor.id });
            }
            if (actor?.role === Role.ADMIN) {
                condition.push({ state: EventState.REVIEW });
                condition.push({ state: EventState.REFUSED });
            }
            const events = await prismaEvent.findMany({
                include: { departments: true, children: true },
                where: {
                    OR: [
                        {
                            AND: [
                                {state: EventState.PUBLISHED},
                                {parentId: null}
                            ]
                        },
                        ...condition
                    ]
                }
            });
            const e = events;
            const p = e.map(prepareEvent);
            return events.map(prepareEvent);
        },
        async createEvent(actor: User, start: Date, end: Date): Promise<ApiEvent> {
            const model = await prismaEvent.create({
                data: {
                    start: start,
                    end: end,
                    state: EventState.DRAFT,
                    authorId: actor.id,
                }
            });
            return prepareEvent(model);
        },
        async cloneEvent(actor: User, id: string): Promise<ApiEvent> {
            const record = await prismaEvent.findUnique({ where: { id: id }, include: { departments: true } });
            /** check policy - only delete if user is author or admin */
            if (!record) {
                throw new HTTP404Error('Event not found');
            }
            if (record.state !== EventState.PUBLISHED && record.authorId !== actor.id) {
                throw new HTTP403Error('Not authorized');
            }
            const newEvent = await prismaEvent.create({
                data: {...clonedProps(record, actor.id), cloned: true},
                include: { departments: true }
            });
            return prepareEvent(newEvent);
        },
        async importEvents(actor: User, filepath: string, filename: string): Promise<{job: Job, importer: Promise<Job>}> {
            const importJob = await prisma.job.create({
                data: {
                    type: JobType.IMPORT,
                    user: { connect: { id: actor.id } },
                    filename: filename,
                }
            });
            const importer = importExcel(filepath, actor.id, importJob.id).then(async (events) => {
                return await prisma.job.update({
                    where: { id: importJob.id },
                    data: {
                        state: JobState.DONE
                    }
                });
            }).catch(async (e) => {
                Logger.error(e);
                return await prisma.job.update({
                    where: { id: importJob.id },
                    data: {
                        state: JobState.ERROR,
                        log: JSON.stringify(e, Object.getOwnPropertyNames(e))
                    }
                });
            });
            return {job: importJob, importer: importer};
        }
    });
}

export default Events(prisma.event);