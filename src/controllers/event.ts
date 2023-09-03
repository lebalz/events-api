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
import {default as Events } from "../models/events";
import path from "path";
import { clonedProps, prepareEvent } from "../models/event.helpers";

const NAME = 'EVENT';
const db = prisma.event;


export const find: RequestHandler = async (req, res, next) => {
    try {
        const event = await Event.findEvent(req.user, req.params.id);
        res.status(200).json(event);
    } catch (error) {
        next(error);
    }
}

export const update: RequestHandler<{ id: string }, any, { data: Event & { departmentIds?: string[] } }> = async (req, res, next) => {
    try {
        const model = await Event.updateEvent(req.user!, req.params.id, req.body.data);

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
            return Event.setState(req.user!, id, state);
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
        const event = await Event.destroy(req.user!, req.params.id);
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


export const all: RequestHandler = async (req, res, next) => {
    try {
        const events = await Event.all(req.user);
        res.json(events);
    } catch (error) {
        next(error);
    }
}

export const create: RequestHandler<any, any, Event> = async (req, res, next) => {
    const { start, end } = req.body;
    try {
        const event = await Event.createEvent(req.user!, start, end);

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

        const newEvent = await Event.cloneEvent(req.user!, eid);
        res.notifications = [
            {
                message: { record: NAME, id: newEvent.id },
                event: IoEvent.NEW_RECORD,
                to: req.user!.id
            }
        ];
        res.status(201).json(prepareEvent(newEvent));
    } catch (e) {
        next(e)
    }
}


export const importEvents: RequestHandler = async (req, res, next) => {
    try {
        const {job, importer} = await Event.importEvents(req.user!, req.file!.path, req.file!.originalname);
 
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