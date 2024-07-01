import { Job, Semester } from '@prisma/client';
import { RequestHandler } from 'express';
import { IoEvent, RecordType } from '../routes/socketEventTypes';
import { notifyChangedRecord } from '../routes/notify';
import Semesters from '../models/semesters';
import { IoRoom } from '../routes/socketEvents';

const NAME = RecordType.Semester;

export const all: RequestHandler = async (req, res, next) => {
    try {
        const models = await Semesters.all();
        res.json(models);
    } catch (error) /* istanbul ignore next */ {
        next(error);
    }
};

export const find: RequestHandler<{ id: string }, any, any> = async (req, res, next) => {
    try {
        const model = await Semesters.findModel(req.params.id);
        res.status(200).json(model);
    } catch (error) /* istanbul ignore next */ {
        next(error);
    }
};

export const create: RequestHandler<any, any, Semester> = async (req, res, next) => {
    try {
        const model = await Semesters.createModel(req.user!, req.body);

        res.notifications = [
            {
                message: { type: NAME, record: model },
                event: IoEvent.NEW_RECORD,
                to: IoRoom.ALL
            }
        ];
        res.status(201).json(model);
    } catch (e) /* istanbul ignore next */ {
        next(e);
    }
};

export const update: RequestHandler<{ id: string }, any, { data: Semester }> = async (req, res, next) => {
    try {
        const model = await Semesters.updateModel(req.user!, req.params.id, req.body.data);
        res.notifications = [
            {
                message: { type: NAME, record: model },
                event: IoEvent.CHANGED_RECORD,
                to: IoRoom.ALL
            }
        ];
        res.status(200).json(model);
    } catch (e) /* istanbul ignore next */ {
        next(e);
    }
};

export const destroy: RequestHandler<{ id: string }, any, any> = async (req, res, next) => {
    try {
        const model = await Semesters.destroy(req.user!, req.params.id);
        res.notifications = [
            {
                message: { type: NAME, id: model.id },
                event: IoEvent.DELETED_RECORD,
                to: IoRoom.ALL
            }
        ];
        res.status(204).send();
    } catch (error) /* istanbul ignore next */ {
        next(error);
    }
};

export const sync: RequestHandler<{ id: string }, any, any> = async (req, res, next) => {
    try {
        const onComplete = (job: Job) => {
            notifyChangedRecord(req.io, { type: RecordType.Job, record: job }, IoRoom.ADMIN);
        };
        const syncJob = await Semesters.sync(req.user!, req.params.id, onComplete);

        res.notifications = [
            {
                message: { type: RecordType.Job, record: syncJob },
                event: IoEvent.NEW_RECORD,
                to: IoRoom.ADMIN
            }
        ];
        res.status(201).json(syncJob);
    } catch (error) /* istanbul ignore next */ {
        next(error);
    }
};
