import type { RegistrationPeriod, Semester } from '@prisma/client';
import { RequestHandler } from 'express';
import { IoEvent, RecordType } from '../routes/socketEventTypes';
import RegistrationPeriods from '../models/registrationPeriod';
import { IoRoom } from '../routes/socketEvents';

const NAME = RecordType.RegistrationPeriod;

export const all: RequestHandler = async (req, res, next) => {
    try {
        const models = await RegistrationPeriods.all();
        res.json(models);
    } catch (error) /* istanbul ignore next */ {
        next(error);
    }
};

export const find: RequestHandler<{ id: string }, any, any> = async (req, res, next) => {
    try {
        const model = await RegistrationPeriods.findModel(req.params.id);
        res.status(200).json(model);
    } catch (error) /* istanbul ignore next */ {
        next(error);
    }
};

export const create: RequestHandler<any, any, RegistrationPeriod> = async (req, res, next) => {
    try {
        const model = await RegistrationPeriods.createModel(req.body);
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
        const model = await RegistrationPeriods.updateModel(req.params.id, req.body.data);

        res.notifications = [
            {
                message: { type: NAME, record: model },
                event: IoEvent.CHANGED_RECORD,
                to: IoRoom.ALL
            }
        ];
        res.status(200).json(model);
    } catch (e) /* istanbul ignore next */ {
        const err = e as Error;
        if (
            err.name === 'PrismaClientUnknownRequestError' &&
            err.message.includes('violates check constraint \\"registration_periods_start_end_check\\"')
        ) {
            return res.status(400).json({ message: 'Start date must be before end date' });
        }
        next(e);
    }
};

export const destroy: RequestHandler<{ id: string }, any, any> = async (req, res, next) => {
    try {
        const model = await RegistrationPeriods.destroy(req.user!, req.params.id);
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
