import { Department, Event, EventState, Job, JobState, JobType, Prisma, PrismaClient, Role, Semester, User } from "@prisma/client";
import prisma from "../prisma";
import { createDataExtractor } from "../controllers/helpers";
import { ApiEvent, clonedProps, clonedUpdateProps, prepareEvent } from "./event.helpers";
import { HTTP400Error, HTTP403Error, HTTP404Error } from "../utils/errors/Errors";
import { importEvents as importService, ImportType } from "../services/importEvents";
import Logger from "../utils/logger";
import Semesters from "./semesters";
import _ from "lodash";
const getData = createDataExtractor<Prisma.EventUncheckedUpdateInput>(
    [
        'audience',
        'classes',
        'description',
        'start',
        'end',
        'location',
        'description',
        'classGroups',
        'userGroupId',
        'descriptionLong',
        'teachingAffected'
    ]
);

type AllEventQueryCondition = ({ state: EventState } | { authorId: string })[];

const rmUndefined = <T>(arr: (T | undefined)[]): T[] => {
    return _.reject(arr, _.isUndefined) as T[];
}

const rootParentSql = (childId: string) => {
    return Prisma.sql`
        WITH RECURSIVE tree as (
            -- start with the requested event
            SELECT id, parent_id
            FROM events
            WHERE id = ${childId}::uuid
            
            UNION
            -- recursively select all ancestors
            SELECT e.id, e.parent_id
            FROM events e
            INNER JOIN tree
            ON e.id=tree.parent_id
        ) -- get first ancestor 
        SELECT * FROM tree WHERE parent_id IS NULL LIMIT 1;
    `;
}

const childrenSql = (parentId: string) => {
    return Prisma.sql`
        WITH RECURSIVE tree as (
            -- start with the requested event
            SELECT id, parent_id
            FROM events
            WHERE id = ${parentId}::uuid
            
            UNION
            -- recursively select all descendants
            SELECT e.id, e.parent_id
            FROM events e
            INNER JOIN tree
            ON e.parent_id=tree.id
        ) -- get first ancestor 
        SELECT * FROM tree WHERE parent_id IS NOT NULL;
    `;
}

function Events(db: PrismaClient['event']) {
    return Object.assign(db, {
        async findModel(actor: User | undefined, id: string): Promise<ApiEvent> {
            const event = await db.findUnique({
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
        async updateModel(actor: User, id: string, data: Prisma.EventUncheckedUpdateInput & { departmentIds?: string[]}): Promise<ApiEvent> {
            const record = await db.findUnique({ where: { id: id }, include: { departments: true } });
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
                model = await db.update({
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
                model = await db.create({
                    data: {
                        ...cProps,
                        ...(getData(data, true) as Prisma.EventCreateInput),
                        parent: {connect: { id: record.id }},
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
        async setState(actor: User, id: string, requested: EventState): Promise<{event: ApiEvent, affected: ApiEvent[]}> {
            const isAdmin = actor!.role === Role.ADMIN;
            const record = await db.findUnique({ where: { id: id }, include: { departments: true, children: true } });
            if (!record) {
                throw new HTTP404Error('Event not found');
            }
            if (record.authorId !== actor.id && !isAdmin) {
                throw new HTTP403Error('Not authorized');
            }
            
            const updater = async () => await db.update({
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
                            const publishedParent = await prisma.$queryRaw<Event[]>(rootParentSql(record.id));

                            /* istanbul ignore next */
                            if (publishedParent.length < 1) {
                                throw new HTTP404Error('Parent not found');
                            }
                            const model = await db.update({
                                where: { id: record.id },
                                data: {
                                    state: requested,
                                    parentId: publishedParent[0].id
                                },
                                include: { departments: true, children: true }
                            });
                            return {event: prepareEvent(model), affected: []};
                        } else {
                            const model = await updater();
                            return {event: prepareEvent(model), affected: []};
                        }
                    }
                    throw new HTTP400Error('Draft can only be set to review');
                case EventState.REVIEW:
                    if (!isAdmin) {
                        throw new HTTP403Error('Forbidden');
                    }
                    if (record.parentId && EventState.PUBLISHED === requested) {
                        const parent = await db.findUnique({ where: { id: record.parentId }, include: { departments: true, children: true } });
                        
                        /* istanbul ignore next */
                        if (!parent) {
                            throw new HTTP404Error('Parent not found');
                        } else if (!!parent.parentId) {
                            throw new HTTP400Error('Parent must be the current published version');
                        }
                        const allChildren = await prisma.$queryRaw<Event[]>(childrenSql(parent.id));

                        const siblings = await db.findMany({ 
                            where: {
                                AND: [
                                    { id: {in: (allChildren || []).map((c) => c.id) }},
                                    { id: { not: record.id } },
                                    { state: EventState.REVIEW }
                                ]
                            },
                            include: { children: true }
                        });
                        const props = clonedUpdateProps(record, record.authorId, {full: true});
                        await prisma.$transaction([
                            /** update the parent (already published) to receive the new props */
                            db.update({  /** <-- now the current version */
                                where: { id: parent.id },
                                data: {
                                    ...clonedUpdateProps(record, record.authorId, {full: true}),
                                    state: EventState.PUBLISHED,
                                    updatedAt: undefined
                                }
                            }),
                            /** swap the child and the parent - ensures that the uuid for the ical stays the same  */
                            db.update({  /** version --> the previous published event, now accessible under the id of the former review candidate */
                                where: { id: record.id },
                                data: {
                                    ...clonedUpdateProps(parent, parent.authorId, {full: true}),
                                    updatedAt: undefined
                                }
                            }),
                            /** ensure that all pending reviews with this parent are refused... */
                            db.updateMany({
                                where: { 
                                    AND: [
                                        { state: EventState.REVIEW },
                                        { id: { in: siblings.map((s) => s.id) }},
                                    ]
                                },
                                data: {
                                    state: EventState.REFUSED
                                }
                            })
                        ]);
                        // refetch both of the published events to ensure updated child ids...
                        // oldCurrent: the previous published event, now accessible under the id of the former review candidate
                        const oldCurrent = await db.findUnique({ where: { id: record.id }, include: { departments: true, children: true } });
                        // updatedCurrent: the current version
                        const updatedCurrent = await db.findUnique({ where: { id: parent.id }, include: { departments: true, children: true } });
                        return {event: prepareEvent(oldCurrent!), affected: [prepareEvent(updatedCurrent!), ...siblings.map(prepareEvent)]};
                    } else if (EventState.PUBLISHED === requested || EventState.REFUSED === requested) {
                        const model = await updater();
                        return {event: prepareEvent(model), affected: []};
                    }
                    throw new HTTP400Error('Review can only be set to Published or to Refused');
                case EventState.PUBLISHED:
                case EventState.REFUSED:
                    /** can't do anything with it */
                    throw new HTTP400Error(`${record.state} state is immutable`);
                 /* istanbul ignore next */
                default: /* shall never happen - difficult to test */
                    throw new HTTP400Error(`Unknown state "${requested}" requested`);
            }
        },
        /**
         * - [PUBLISHED, REFUSED, REVIEW] -> soft delete
         * - [DRAFT] -> hard delete
         * @param record 
         * @param options 
         * @returns 
         */
        async _forceDestroy(record: Event | ApiEvent, options: {unlinkFromJob?: boolean} = {}): Promise<ApiEvent> {
            /** only drafts are allowed to be hard deleted */
            if (record.state === EventState.DRAFT) {
                const model = await db.delete({
                    where: {
                        id: record.id,
                    },
                    include: { departments: true, children: true },
                });
                return prepareEvent(model);
            }
            const model = await db.update({
                where: {
                    id: record.id,
                },
                data: {
                    deletedAt: new Date(),
                    jobId: options.unlinkFromJob ? null : undefined
                },
                include: { departments: true, children: true },
            });
            return prepareEvent(model);
        },
        async _unlinkFromUserGroup(id: string) {
            await db.update({
                where: { id: id },
                data: {
                    userGroupId: null
                }
            });
        },
        async destroy(actor: User, id: string): Promise<ApiEvent> {
            const record = await this.findModel(actor, id);
            // /** check policy - only delete if user is author or admin */
            if (record.authorId !== actor.id && actor.role !== Role.ADMIN) {
                throw new HTTP403Error('Not authorized');
            }
            return this._forceDestroy(record);
        },
        async published(semesterId?: string): Promise<ApiEvent[]> {
            const semester = await (semesterId ? Semesters.findModel(semesterId) : Semesters.current());
            const events = await db.findMany({
                include: { departments: true, children: true },
                where: {
                    AND: [
                        { start: { lte: semester.end } },
                        { end: { gte: semester.start } },
                        { state: EventState.PUBLISHED },
                        { parentId: null }
                    ]
                },
                orderBy: { start: 'asc' }
            });
            return events.map(prepareEvent);
        },
        async forUser(user: User, semesterId?: string): Promise<ApiEvent[]> {
            const isAdmin = user.role === Role.ADMIN;
            const semester = await (semesterId ? Semesters.findModel(semesterId) : Semesters.current());
            const events = await db.findMany({
                include: { departments: true, children: true },
                where: {
                    AND: [
                        { start: { lte: semester.end } },
                        { end: { gte: semester.start } },
                        {
                            NOT: {
                                AND: [
                                    { state: EventState.PUBLISHED },
                                    { parentId: null },
                                ]
                            }
                        },
                        {
                            OR: rmUndefined([
                                { authorId: user.id },
                                isAdmin ? { state: EventState.REVIEW } : undefined,
                                isAdmin ? { state: EventState.REFUSED } : undefined
                            ])
                        }
                    ]
                },
                orderBy: { start: 'asc' }
            });
            return events.map(prepareEvent);
        },
        async all(actor?: User | undefined, semesterId?: string): Promise<ApiEvent[]> {
            if (!actor) {
                return this.published(semesterId);
            }
            return [...await this.published(semesterId), ...await this.forUser(actor, semesterId)];
        },
        async createModel(actor: User, start: Date, end: Date): Promise<ApiEvent> {
            const model = await db.create({
                data: {
                    start: start,
                    end: end,
                    state: EventState.DRAFT,
                    authorId: actor.id,
                },
                include: { children: true }
            });
            return prepareEvent(model);
        },
        async cloneModel(actor: User, id: string): Promise<ApiEvent> {
            const record = await db.findUnique({ where: { id: id }, include: { departments: true } });
            if (!record) {
                throw new HTTP404Error('Event not found');
            }
            if (record.state !== EventState.PUBLISHED && record.authorId !== actor.id) {
                throw new HTTP403Error('Forbidden');
            }
            const newEvent = await db.create({
                data: {...clonedProps(record, actor.id), cloned: true},
                include: { departments: true, children: true }
            });
            return prepareEvent(newEvent);
        },
        async importEvents(actor: User, filepath: string, filename: string, type: ImportType): Promise<{job: Job, importer: Promise<Job>}> {
            const importJob = await prisma.job.create({
                data: {
                    type: JobType.IMPORT,
                    user: { connect: { id: actor.id } },
                    filename: filename,
                }
            });
            const importer = importService(filepath, actor.id, importJob.id, type).then(async (events) => {
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