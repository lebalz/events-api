import { NextFunction, Request, RequestHandler, Response } from "express";
import prisma from "../prisma";
import { IoEvent } from "../routes/socketEventTypes";
import { notifyChangedRecord } from "../routes/notify";
import { importExcel } from "../services/importExcel";
import type { Department, Job, User, Event, Prisma } from "@prisma/client";
import { Role, EventState, JobType } from "@prisma/client";
import { createDataExtractor } from "./helpers";
import { IoRoom } from "../routes/socketEvents";
import createExcel from "../services/createExcel";
import { existsSync } from "fs";
import {default as Events } from "../models/event";
import path from "path";
import { clonedProps, prepareEvent } from "../models/event.helpers";

const NAME = 'EVENT';
const db = prisma.event;


export const find: RequestHandler = async (req, res, next) => {
    try {
        const event = await Events.findEvent(req.user, req.params.id);
        res.status(200).json(event);
    } catch (error) {
        next(error);
    }
}

export const update: RequestHandler<{ id: string }, any, { data: Event & { departmentIds?: string[] } }> = async (req, res, next) => {
    try {
        const model = await Events.updateEvent(req.user!, req.params.id, req.body.data);

        res.notifications = [
            {
                message: { record: NAME, id: model.id },
                event: IoEvent.CHANGED_RECORD,
                to: model.state === EventState.PUBLISHED ? undefined : req.user!.id
            }
        ]
        res.status(200).json(model);
    } catch (error) {
        next(error);
    }
}

export const setState: RequestHandler<{}, any, { data: { ids: string[], state: EventState } }> = async (req, res, next) => {
    try {
        const { ids, state } = req.body.data;
        const events = await Promise.all(ids.map((id) => {
            return Events.setState(req.user!, id, state);
        }));
        const updatedIds = events.map(e => e.id);
        const authorIds = [...new Set(events.map(e => e.authorId).filter(id => !!id))]

        const audience = new Set<IoRoom>();

        /** NOTIFICATIONS */
        switch (state) {
            case EventState.DRAFT:
            case EventState.REVIEW:
            case EventState.REFUSED:
                audience.add(IoRoom.ADMIN);
                break;
            case EventState.PUBLISHED:
                audience.add(IoRoom.ALL);
                break;
        }
        [...audience].forEach((room) => {
            res.notifications?.push({
                message: { state: state, ids: updatedIds },
                event: IoEvent.CHANGED_STATE,
                to: room
            })
        });
        authorIds.forEach((id) => {
            res.notifications?.push({
                message: { state: state, ids: updatedIds },
                event: IoEvent.CHANGED_STATE,
                to: id
            });
        });
        res.status(200).json(events);
    } catch (error) {
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
    } catch (error) {
        next(error);
    }
}

type AllEventQueryCondition = ({ state: EventState } | { authorId: string })[];

export const all: RequestHandler = async (req, res, next) => {
    try {
        const condition: AllEventQueryCondition = [];
        if (req.user) {
            condition.push({ authorId: req.user.id });
        }
        if (req.user?.role === Role.ADMIN) {
            condition.push({ state: EventState.REVIEW });
            condition.push({ state: EventState.REFUSED });
        }
        const events = await db
            .findMany({
                include: { departments: true, children: true },
                where: {
                    OR: [
                        {
                            AND: [
                                {state: EventState.PUBLISHED},
                                {deletedAt: null}
                            ]
                        },
                        ...condition
                    ]
                }
            })
            .then((events) => {
                return events.map(prepareEvent);
            });
        res.json(events);
    } catch (error) {
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
    } catch (error) {
        next(error);
    }
}

export const create: RequestHandler<any, any, Event> = async (req, res, next) => {
    const { start, end } = req.body;
    try {
        const uid = req.user!.id;
        const event = await db.create({
            data: {
                start,
                end,
                author: {
                    connect: {
                        id: uid
                    }
                }
            }
        });

        res.notifications = [
            {
                message: { record: NAME, id: event.id },
                event: IoEvent.NEW_RECORD,
                to: uid
            }
        ];
        res.status(201).json({ ...event, departmentIds: [] });
    } catch (e) {
        next(e)
    }
}


export const cloneEvent = async (id: string, uid: string) => {
    const event = await db.findUnique({ where: { id }, include: { departments: true } });
    if (!event) {
        return Promise.resolve(null);
    }
    const newEvent = await db.create({
        data: {...clonedProps(event, uid), cloned: true},
        include: { departments: true, children: true }
    });
    return newEvent;
}


export const clone: RequestHandler<{ id: string }, any, any> = async (req, res, next) => {
    try {
        const uid = req.user!.id;
        const eid = req.params.id;
        const newEvent = await cloneEvent(eid, uid);
        if (!newEvent) {
            return res.status(404).json({ message: 'Not found' });
        }

        res.notifications = [
            {
                message: { record: NAME, id: newEvent.id },
                event: IoEvent.NEW_RECORD,
                to: uid
            }
        ];
        res.status(201).json(prepareEvent(newEvent));
    } catch (e) {
        next(e)
    }
}


export const importEvents: RequestHandler = async (req, res, next) => {
    try {
        const importJob = await prisma.job.create({
            data: {
                type: JobType.IMPORT,
                user: { connect: { id: req.user!.id } },
                filename: req.file!.originalname,
            }
        });
        if (req.file) {
            importExcel(req.file!.path, req.user!.id, importJob.id).then(async (events) => {
                await prisma.job.update({
                    where: { id: importJob.id },
                    data: {
                        state: 'DONE',
                    }
                });
            }).catch(async (e) => {
                console.error(e);
                await prisma.job.update({
                    where: { id: importJob.id },
                    data: {
                        state: 'ERROR',
                        log: JSON.stringify(e, Object.getOwnPropertyNames(e))
                    }
                });
            }).finally(() => {
                notifyChangedRecord(req.io, { record: 'JOB', id: importJob.id });
            });
        }

        res.notifications = [
            {
                message: { record: 'JOB', id: importJob.id },
                event: IoEvent.NEW_RECORD,
                to: req.user!.id
            }
        ];
        res.json(importJob);
    } catch (error) {
        next(error);
    }
}
