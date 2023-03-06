import { RequestHandler } from "express";
import prisma from "../prisma";
import { IoEvent } from "../routes/socketEventTypes";
import { prepareEvent } from "./event";


export const find: RequestHandler = async (req, res, next) => {
    try {
        const job = await prisma.job.findUnique({
            where: { id: req.params.id },
            include: {
                events: {
                    include: {
                        departments: true,
                        author: true,
                        job: true
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
            throw new Error('User not found')
        }
        res.json(user.jobs);
    } catch (error) {
        next(error);
    }
}

export const destroy: RequestHandler = async (req, res, next) => {
    try {
        const job = await prisma.job.findUnique({
            where: { id: req.params.id },
        });
        if (!job) {
            return res.status(204).send();
        }
        if (job.userId !== req.user!.id) {
            return res.status(403).send();
        }
        await prisma.job.delete({
            where: { id: req.params.id },
        });

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
