import { NextFunction, Request, RequestHandler, Response } from "express";
import prisma from "../prisma";
import { IoEvent } from "../routes/socketEventTypes";
import { notifyChangedRecord } from "../routes/notify";
import { importExcel } from "../services/importExcel";
import type { Department, Job, User, Event } from "@prisma/client";
import { Role, EventState, JobType } from "@prisma/client";
import { createDataExtractor } from "./helpers";
import { IoRoom } from "../routes/socketEvents";
import createExcel from "../services/createExcel";
import { existsSync } from "fs";
import path from "path";

const getData = createDataExtractor<Event>(
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
        'descriptionLong',
        'teachingAffected',
        'subjects'
    ]
);
const NAME = 'EVENT';
const db = prisma.event;


export const prepareEvent = (event: (Event & {
    author?: User;
    job?: Job | null;
    departments: Department[];
}) | null) => {
    return {
        ...event,
        job: undefined,
        jobId: event?.jobId || event?.job?.id,
        author: undefined,
        authorId: event?.authorId || event?.author?.id,
        departments: undefined,
        departmentIds: event?.departments.map((d) => d.id) || [],
    };
}

export const find: RequestHandler = async (req, res, next) => {
    try {

        const event = await db
            .findUnique({
                where: { id: req.params.id },
                include: { departments: true },
            })
        if (!event) {
            return res.status(404).json({ message: 'Not found' });
        }
        if (event.authorId === req.user?.id) {
            return res.status(200).json(prepareEvent(event));
        }
        if (event.state === EventState.PUBLISHED) {
            return res.status(200).json(prepareEvent(event));
        }
        if (req.user?.role === Role.ADMIN && ([EventState.REVIEW, EventState.REFUSED] as string[]).includes(event.state)) {
            return res.status(200).json(prepareEvent(event));
        }
        res.status(404).json({ message: 'You are not allowed to fetch this event' });
    } catch (error) {
        next(error);
    }
}

export const update: RequestHandler<{ id: string }, any, { data: Event & { departmentIds?: string[] } }> = async (req, res, next) => {
    try {
        const record = await db.findUnique({ where: { id: req.params.id } });
        if (!req.user || record?.authorId !== req.user!.id) {
            return res.status(403).json({ message: 'You are not allowed to update this record' });
        }
        /** remove fields not updatable*/
        const data = getData(req.body.data);
        const departmentIds = req.body.data.departmentIds || [];
        const model = await db.update({
            where: { id: req.params.id },
            data: {
                ...data,
                departments: {
                    set: departmentIds.map((id) => ({ id }))
                }
            },
            include: { author: true, job: true, departments: true },
        });

        res.notifications = [
            {
                message: { record: NAME, id: model.id },
                event: IoEvent.CHANGED_RECORD,
                to: model.state === EventState.PUBLISHED ? undefined : req.user!.id
            }
        ]
        res.status(200).json(prepareEvent(model));
    } catch (error) {
        next(error);
    }
}


export const setState: RequestHandler<{}, any, { data: { ids: string[], state: EventState } }> = async (req, res, next) => {
    try {
        const isAdmin = req.user!.role === Role.ADMIN;
        const records = await db.findMany({ where: { id: { in: req.body.data.ids }, authorId: isAdmin ? undefined : req.user!.id } });
        const allowedEventIds: string[] = [];
        const requested = req.body.data.state;
        res.notifications = [];
        records.forEach((record) => {
            switch (record.state) {
                case EventState.DRAFT:
                    if (EventState.REVIEW === requested) {
                        allowedEventIds.push(record.id);
                    }
                case EventState.REVIEW:
                    if (EventState.DRAFT === requested) {
                        allowedEventIds.push(record.id);
                    }
                    if (isAdmin && EventState.PUBLISHED === requested) {
                        allowedEventIds.push(record.id);
                    }
                    if (isAdmin && EventState.REFUSED === requested) {
                        allowedEventIds.push(record.id);
                    }
                    break;
                case EventState.PUBLISHED:
                    /** can't do anything with it */
                    break;
            }
        });
        await db.updateMany({
            where: { id: { in: allowedEventIds } },
            data: {
                state: requested
            }
        });
        const updated = await db.findMany({
            where: { id: { in: allowedEventIds } },
            include: { author: true, job: true, departments: true },
        }).then((events) => {
            return events.map(prepareEvent);
        });

        const audience = new Set<IoRoom>();

        /** NOTIFICATIONS */
        switch (requested) {
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
                message: { state: requested, ids: allowedEventIds },
                event: IoEvent.CHANGED_STATE,
                to: room
            })
        });
        updated.forEach((record) => {
            res.notifications?.push({
                message: { state: requested, ids: allowedEventIds },
                event: IoEvent.CHANGED_STATE,
                to: record.authorId
            });
        });
        res.status(200).json(updated);
    } catch (error) {
        next(error);
    }
}

export const destroy: RequestHandler = async (req, res, next) => {
    try {
        /** check policy - only delete if user is author or admin */
        const record = await db.findUnique({ where: { id: req.params.id } });
        if (req.user?.role !== Role.ADMIN && record?.authorId !== req.user!.id) {
            return res.status(403).json({ message: 'You are not allowed to delete this event' });
        }

        if (!record) {
            return res.status(200).send();
        }
        let model: Event;
        if (record.state === EventState.DRAFT) {
            model = await db.delete({
                where: {
                    id: req.params.id,
                },
            });
            res.notifications = [{
                message: { record: NAME, id: model.id },
                event: IoEvent.DELETED_RECORD,
                to: req.user!.id
            }]
        } else {
            model = await db.update({
                where: {
                    id: req.params.id,
                },
                data: {
                    deletedAt: new Date()
                },
            });
            res.notifications = [{
                message: { record: NAME, id: model.id },
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
        const condition: AllEventQueryCondition = [{ state: EventState.PUBLISHED }];
        if (req.user) {
            condition.push({ authorId: req.user.id });
        }
        if (req.user?.role === Role.ADMIN) {
            condition.push({ state: EventState.REVIEW });
            condition.push({ state: EventState.REFUSED });
        }
        const events = await db
            .findMany({
                include: { departments: true },
                where: {
                    AND: {
                        parentId: null,
                        OR: condition
                    }
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

export const clone: RequestHandler<{ id: string }, any, any> = async (req, res, next) => {
    try {
        const uid = req.user!.id;
        const eid = req.params.id;
        const event = await db.findUnique({ where: { id: eid }, include: { departments: true } });
        if (!event) {
            return res.status(404).json({ message: 'Not found' });
        }
        const newEvent = await db.create({
            data: {
                start: event.start,
                end: event.end,
                klpOnly: event.klpOnly,
                classes: event.classes,
                description: `📌 ${event.description}`,
                teachersOnly: event.teachersOnly,
                location: event.location,
                descriptionLong: event.descriptionLong,
                teachingAffected: event.teachingAffected,
                subjects: event.subjects,
                classGroups: event.classGroups,
                state: EventState.DRAFT,
                departments: {
                    connect: event.departments.map((d) => ({ id: d.id }))
                },
                author: {
                    connect: {
                        id: uid
                    }
                }
            },
            include: { departments: true }
        });

        res.notifications = [
            {
                message: { record: NAME, id: event.id },
                event: IoEvent.NEW_RECORD,
                to: newEvent.id
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