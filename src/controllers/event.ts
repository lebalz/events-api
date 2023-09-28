import { RequestHandler } from "express";
import prisma from "../prisma";
import { IoEvent } from "../routes/socketEventTypes";
import { notifyChangedRecord } from "../routes/notify";
import type { Event } from "@prisma/client";
import { EventState } from "@prisma/client";
import { IoRoom } from "../routes/socketEvents";
import createExcel from "../services/createExcel";
import Events from "../models/events";
import path from "path";
import { prepareEvent } from "../models/event.helpers";
import { HTTP400Error } from "../utils/errors/Errors";

const NAME = 'EVENT';


export const find: RequestHandler = async (req, res, next) => {
    try {
        const event = await Events.findModel(req.user, req.params.id);
        res.status(200).json(event);
    } catch (error) /* istanbul ignore next */ {
        next(error);
    }
}

export const update: RequestHandler<{ id: string }, any, { data: Event & { departmentIds?: string[] } }> = async (req, res, next) => {
    try {
        const model = await Events.updateModel(req.user!, req.params.id, req.body.data);

        res.notifications = [
            {
                message: { record: NAME, id: model.id },
                event: IoEvent.CHANGED_RECORD,
                to: model.state === EventState.PUBLISHED ? undefined : req.user!.id
            }
        ]
        res.status(200).json(model);
    } catch (error) /* istanbul ignore next */ {
        next(error);
    }
}

export const setState: RequestHandler<{}, any, { data: { ids: string[], state: EventState } }> = async (req, res, next) => {
    try {
        const { ids, state } = req.body.data;
        const events = await Promise.all(ids.map((id) => {
            return Events.setState(req.user!, id, state);
        }));
        const newStateIds = events.map(e => e.event.id);
        const updated = events.map(e => e.affected).flat();

        const audience = new Set<IoRoom | string>(events.map(e => e.event.authorId));

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
                break;
        }
        res.notifications = [];
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
                case EventState.DRAFT:
                    audience.push(event.authorId);
                    break;
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
                    to: to
                });
            });
        });
        res.status(201).json(events.map(e => e.event));
    } catch (error) /* istanbul ignore next */ {
        next(error);
    }
}

export const destroy: RequestHandler = async (req, res, next) => {
    try {
        const event = await Events.destroy(req.user!, req.params.id);
        if (event.state === EventState.DRAFT) {
            res.notifications = [{
                message: { record: NAME, id: event.id },
                event: IoEvent.DELETED_RECORD,
                to: event.authorId
            }]
        } else {
            res.notifications = [{
                message: { record: NAME, id: event.id },
                event: IoEvent.CHANGED_RECORD,
                to: IoRoom.ALL
            }]
        }
        res.status(204).send();
    } catch (error) /* istanbul ignore next */ {
        next(error);
    }
}


export const all: RequestHandler = async (req, res, next) => {
    try {
        const events = await Events.all(req.user);
        res.json(events);
    } catch (error) /* istanbul ignore next */ {
        next(error);
    }
}

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
    } catch (e) {
        next(e)
    }
}

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
    } catch (e) {
        next(e)
    }
}


export const importEvents: RequestHandler = async (req, res, next) => {
    try {
        const {job, importer} = await Events.importEvents(req.user!, req.file!.path, req.file!.originalname);
 
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
}

export const exportExcel: RequestHandler = async (req, res, next) => {
    try {
        const currentSemester = await prisma.semester.findFirst({where: {
            AND: {
                start: {
                    lte: new Date()
                },
                end: {
                    gte: new Date()
                }
            }
        }});
        if (!currentSemester) {
            throw new HTTP400Error('No semester found');
        }
        const file = await createExcel(currentSemester?.id || '-1');
        if (file) {
            const fpath = path.resolve(file);
            res.download(fpath, (err) => {
                if (err) {
                    console.error(err);
                }
            });
        } else {
            res.status(400).json({message: 'No semester found'});
        }
    } catch (error) /* istanbul ignore next */ {
        next(error);
    }
}