import { EventState, type Job, type Prisma } from "@prisma/client";
import { RequestHandler } from "express";
import prisma from "../prisma";
import { IoEvent } from "../routes/socketEventTypes";
import { createDataExtractor } from "./helpers";
import { prepareEvent } from "../models/event.helpers";

const NAME = 'JOB';
const getData = createDataExtractor<Job>(
    ['description']
);
const db = prisma.job;


export const find: RequestHandler = async (req, res, next) => {
    try {
        const job = await db.findUnique({
            where: { id: req.params.id },
            include: {
                events: {
                    include: {
                        departments: true,
                        author: true,
                        job: true,
                        children: true,
                    }
                }
            },
        });
        const events = job?.events.map(prepareEvent);
        res.json(
            {
                ...job,
                events: events
            }
        );
    } catch (error) {
        next(error);
    }
}

export const all: RequestHandler = async (req, res, next) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user!.id },
            include: { jobs: true }
        });
        if (!user) {
            return  res.status(404).json({ message: 'User not found' });
        }
        res.json(user.jobs);
    } catch (error) {
        next(error);
    }
}

export const update: RequestHandler<{ id: string }, any, { data: Job }> = async (req, res, next) => {
    /** remove fields not updatable*/
    const data = getData(req.body.data);
    try {
        const [count, model] = await prisma.$transaction([
            db.updateMany({
                where: { 
                    AND: [
                        { id: req.params.id },
                        { userId: req.user!.id }
                    ],
                },
                data
            }),
            db.findUnique({ where: { id: req.params.id } })
        ]);

        if (model) {
            res.notifications = [
                {
                    message: { record: NAME, id: model.id },
                    event: IoEvent.NEW_RECORD
                }
            ]
        }
        res.status(200).json(model);
    } catch (e) {
        next(e)
    }
}


export const destroy: RequestHandler = async (req, res, next) => {
    try {
        const job = await db.findUnique({
            where: { 
                id: req.params.id 
            },
            include: {
                events: true
            }
        });
        if (!job) {
            return res.status(204).send();
        }
        if (job.userId !== req.user!.id) {
            return res.status(403).json({ message: 'You are not allowed to delete this job' });
        }
        const canDestroy = job.events.length === 0 || job.events.every(e => e.state !== EventState.PUBLISHED);
        if (canDestroy) {
            await prisma.job.delete({
                where: { id: req.params.id },
            });
        } else {
             const updatePromises = job.events.map(e => {
                if (e.state === EventState.PUBLISHED) {
                    return prisma.event.update({
                        where: { id: e.id },
                        data: {
                            deletedAt: new Date()
                        }
                    });
                } else {
                    return prisma.event.delete({
                        where: { id: e.id }
                    });
                }

            });
            await Promise.all(updatePromises);
        }

        res.notifications = [
            {
                message: { record: 'JOB', id: req.params.id },
                event: IoEvent.DELETED_RECORD
            }
        ]
        res.status(204).send();
    } catch (error) {
        next(error);
    }
}
