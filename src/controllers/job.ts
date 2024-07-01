import { Event, EventState, type Job } from '@prisma/client';
import { RequestHandler } from 'express';
import { IoEvent, RecordType } from '../routes/socketEventTypes';
import Jobs from '../models/jobs';
import { HTTP404Error } from '../utils/errors/Errors';
import { IoRoom } from '../routes/socketEvents';
import { ApiEvent } from '../models/event.helpers';

const NAME = RecordType.Job;

export const find: RequestHandler = async (req, res, next) => {
    try {
        const job = await Jobs.findModel(req.user!, req.params.id);
        res.json(job);
    } catch (error) /* istanbul ignore next */ {
        next(error);
    }
};

export const all: RequestHandler = async (req, res, next) => {
    try {
        const jobs = await Jobs.all(req.user!);
        res.json(jobs);
    } catch (error) /* istanbul ignore next */ {
        next(error);
    }
};

const getAudience = (job: { userId: string; events: (Event | ApiEvent)[] }) => {
    return job.events.some((e) => e.state === EventState.PUBLISHED)
        ? IoRoom.ALL
        : job.events.some((e) => e.state === EventState.REFUSED || e.state === EventState.REVIEW)
          ? IoRoom.ADMIN
          : job.userId;
};

export const update: RequestHandler<{ id: string }, any, { data: Job }> = async (req, res, next) => {
    try {
        /** remove fields not updatable*/
        const model = await Jobs.updateModel(req.user!, req.params.id, req.body.data);
        res.notifications = [
            {
                message: { type: NAME, record: model },
                event: IoEvent.CHANGED_RECORD,
                to: getAudience(model)
            }
        ];
        res.status(200).json(model);
    } catch (e) /* istanbul ignore next */ {
        next(e);
    }
};

export const destroy: RequestHandler = async (req, res, next) => {
    try {
        try {
            const job = await Jobs.destroy(req.user!, req.params.id);
            res.notifications = [
                {
                    message: { type: NAME, id: job.id },
                    event: IoEvent.DELETED_RECORD,
                    to: getAudience(job)
                }
            ];
            res.status(204).send();
        } catch (error) /* istanbul ignore next */ {
            if (error instanceof HTTP404Error) {
                /** if the job does not exist, we still want to send a 204 */
                return res.status(204).send();
            }
            /* istanbul ignore next */
            throw error;
        }
    } catch (error) /* istanbul ignore next */ {
        next(error);
    }
};
