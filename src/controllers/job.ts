import { type Job } from "@prisma/client";
import { RequestHandler } from "express";
import { IoEvent } from "../routes/socketEventTypes";
import Jobs from "../models/jobs";
import { HTTP404Error } from "../utils/errors/Errors";

const NAME = 'JOB';

export const find: RequestHandler = async (req, res, next) => {
    try {
        const job = await Jobs.findModel(req.user!, req.params.id);
        res.json(job);
    } catch (error) {
        next(error);
    }
}

export const all: RequestHandler = async (req, res, next) => {
    try {
        const jobs = await Jobs.all(req.user!);
        res.json(jobs);
    } catch (error) /* istanbul ignore next */ {
        next(error);
    }
}

export const update: RequestHandler<{ id: string }, any, { data: Job }> = async (req, res, next) => {
    /** remove fields not updatable*/
    try {
        const model = await Jobs.updateModel(req.user!, req.params.id, req.body.data);
        res.notifications = [
            {
                message: { record: NAME, id: model.id },
                event: IoEvent.NEW_RECORD
            }
        ]
        res.status(200).json(model);
    } catch (e) /* istanbul ignore next */ {
        next(e)
    }
}

export const destroy: RequestHandler = async (req, res, next) => {
    try {
        try {
            const job = await Jobs.destroy(req.user!, req.params.id);
            res.notifications = [
                {
                    message: { record: NAME, id: job.id },
                    event: IoEvent.DELETED_RECORD
                }
            ]
            res.status(204).send();
        } catch (error) {
            if (error instanceof HTTP404Error) {
                /** if the job does not exist, we still want to send a 204 */
                return res.status(204).send();
            }
            throw error;
        }
    } catch (error) /* istanbul ignore next */ {
        next(error);
    }
}
