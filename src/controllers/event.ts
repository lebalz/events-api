import { RequestHandler } from 'express';
import prisma from '../prisma';
import { IoEvent } from '../routes/socketEventTypes';
import { notifyChangedRecord } from '../routes/notify';
import type { Event, Prisma } from '@prisma/client';
import { EventState, Role } from '@prisma/client';
import { IoRoom } from '../routes/socketEvents';
import Events from '../models/events';
import { HTTP403Error } from '../utils/errors/Errors';
import { ImportType } from '../services/importEvents';
import { notifyOnDelete, notifyOnUpdate } from '../services/notifications/notifyUsers';

const NAME = 'EVENT';

export const find: RequestHandler = async (req, res, next) => {
    try {
        const event = await Events.findModel(req.user, req.params.id);
        res.status(200).json(event);
    } catch (error) /* istanbul ignore next */ {
        next(error);
    }
};

export const update: RequestHandler<
    { id: string },
    any,
    { data: Event & { departmentIds?: string[]; meta?: any } }
> = async (req, res, next) => {
    try {
        const model = await Events.updateModel(req.user!, req.params.id, req.body.data);
        res.notifications = [
            {
                message: { record: NAME, id: model.id },
                event: IoEvent.CHANGED_RECORD,
                to: model.state === EventState.PUBLISHED ? IoRoom.ALL : req.user!.id
            }
        ];
        res.status(200).json(model);
    } catch (error) /* istanbul ignore next */ {
        const err = error as Error;
        if (
            err.name === 'PrismaClientUnknownRequestError' &&
            err.message.includes('violates check constraint \\"events_start_end_check\\"')
        ) {
            return res.status(400).json({ message: 'Start date must be before end date' });
        }
        next(error);
    }
};

export const updateMeta: RequestHandler<{ id: string }, any, { data: any }> = async (req, res, next) => {
    try {
        const model = await Events.updateMeta(req.user!, req.params.id, req.body.data);
        res.notifications = [
            {
                message: { record: NAME, id: model.id },
                event: IoEvent.CHANGED_RECORD,
                to: model.state === EventState.PUBLISHED ? IoRoom.ALL : req.user!.id
            }
        ];
        res.status(200).json(model);
    } catch (error) /* istanbul ignore next */ {
        next(error);
    }
};

export const setState: RequestHandler<
    {},
    any,
    { data: { ids: string[]; state: EventState; message?: string } }
> = async (req, res, next) => {
    try {
        const { ids, state, message } = req.body.data;
        const events = await Promise.all(
            ids.map((id) => {
                return Events.setState(req.user!, id, state);
            })
        );

        notifyOnUpdate(events, message || 'Keine weiteren Angaben', req.user!);

        /**
         *
         */

        const newStateIds = events.map((e) => e.event.id);
        const updated = events.map((e) => e.affected).flat();
        const audience = new Set<IoRoom | string>(events.map((e) => e.event.authorId));
        const affectedSemesterIds = await prisma.semester.findMany({
            where: {
                OR: updated
                    .map((e) => {
                        return [
                            { start: { gte: e.start, lte: e.end } },
                            { end: { gte: e.start, lte: e.end } },
                            {
                                AND: {
                                    start: { lte: e.start },
                                    end: { gte: e.end }
                                }
                            }
                        ];
                    })
                    .flat()
            },
            select: {
                id: true
            },
            distinct: ['id']
        });

        res.notifications = [];
        /** NOTIFICATIONS */
        switch (state) {
            /** DRAFT is not possible, since DRAFT -> DRAFT is not allowed */
            case EventState.REVIEW:
            case EventState.REFUSED:
                audience.add(IoRoom.ADMIN);
                break;
            case EventState.PUBLISHED:
                audience.clear();
                audience.add(IoRoom.ALL);
                if (updated.length > 0) {
                    res.notifications.push({
                        message: {
                            record: 'SEMESTER',
                            semesterIds: affectedSemesterIds.map((s) => s.id)
                        },
                        event: IoEvent.RELOAD_AFFECTING_EVENTS,
                        to: IoRoom.ALL
                    });
                }
                break;
        }
        [...audience].forEach((to) => {
            res.notifications!.push({
                message: { state: state, ids: newStateIds },
                event: IoEvent.CHANGED_STATE,
                to: to
            });
        });
        updated.forEach((event) => {
            const audience: (string | IoRoom)[] = [];
            switch (event.state) {
                /** DRAFT is not possible, since DRAFT -> DRAFT is not allowed */
                case EventState.REVIEW:
                case EventState.REFUSED:
                    audience.push(event.authorId);
                    audience.push(IoRoom.ADMIN);
                    break;
                case EventState.PUBLISHED:
                    audience.push(IoRoom.ALL);
                    break;
            }
            audience.forEach((to) => {
                res.notifications!.push({
                    event: IoEvent.CHANGED_RECORD,
                    message: { record: 'EVENT', id: event.id },
                    to: to,
                    toSelf: true
                });
            });
        });
        res.status(201).json(events.map((e) => e.event));
    } catch (error) /* istanbul ignore next */ {
        next(error);
    }
};

export const destroy: RequestHandler = async (req, res, next) => {
    try {
        const event = await Events.destroy(req.user!, req.params.id);
        if (event.state === EventState.DRAFT) {
            res.notifications = [
                {
                    message: { record: NAME, id: event.id },
                    event: IoEvent.DELETED_RECORD,
                    to: event.authorId
                }
            ];
        } else {
            notifyOnDelete(event, req.user!);
            res.notifications = [
                {
                    message: { record: NAME, id: event.id },
                    event: IoEvent.CHANGED_RECORD,
                    to: IoRoom.ALL
                }
            ];
        }
        res.status(204).send();
    } catch (error) /* istanbul ignore next */ {
        next(error);
    }
};

export const all: RequestHandler<any, any, any, { semesterId?: string; ids?: string[] }> = async (
    req,
    res,
    next
) => {
    try {
        if (req.query.ids) {
            const events = await Events.allByIds(req.user, req.query.ids);
            return res.json(events);
        }
        const events = await Events.published(req.query.semesterId);
        res.json(events);
    } catch (error) /* istanbul ignore next */ {
        next(error);
    }
};

export const create: RequestHandler<any, any, Event> = async (req, res, next) => {
    const { start, end } = req.body;
    try {
        const event = await Events.createModel(req.user!, start, end);

        res.notifications = [
            {
                message: { record: NAME, id: event.id },
                event: IoEvent.NEW_RECORD,
                to: req.user!.id
            }
        ];
        res.status(201).json(event);
    } catch (e) /* istanbul ignore next */ {
        next(e);
    }
};

export const clone: RequestHandler<{ id: string }, any, any> = async (req, res, next) => {
    try {
        const eid = req.params.id;

        const newEvent = await Events.cloneModel(req.user!, eid);
        res.notifications = [
            {
                message: { record: NAME, id: newEvent.id },
                event: IoEvent.NEW_RECORD,
                to: req.user!.id
            }
        ];
        res.status(201).json(newEvent);
    } catch (e) /* istanbul ignore next */ {
        next(e);
    }
};

export const importEvents: RequestHandler<any, any, any, { type: ImportType }> = async (req, res, next) => {
    try {
        if (
            req.user!.role !== Role.ADMIN &&
            [ImportType.GBSL_XLSX, ImportType.GBJB_CSV].includes(req.query.type)
        ) {
            throw new HTTP403Error('Not authorized to import legacy format');
        }
        const { job, importer } = await Events.importEvents(
            req.user!,
            req.file!.path,
            req.file!.originalname,
            req.query.type
        );

        importer.finally(() => {
            notifyChangedRecord(req.io, { record: 'JOB', id: job.id });
        });

        res.notifications = [
            {
                message: { record: 'JOB', id: job.id },
                event: IoEvent.NEW_RECORD,
                to: req.user!.id
            }
        ];
        res.json(job);
    } catch (error) /* istanbul ignore next */ {
        next(error);
    }
};
