import type { Department } from '@prisma/client';
import { RequestHandler } from 'express';
import prisma from '../prisma';
import { IoEvent } from '../routes/socketEventTypes';
import Departments from '../models/departments';
import { createDataExtractor } from './helpers';
import { IoRoom } from '../routes/socketEvents';

const NAME = 'DEPARTMENT';

export const all: RequestHandler = async (req, res, next) => {
    try {
        const models = await Departments.all();
        res.json(models);
    } catch (error) /* istanbul ignore next */ {
        next(error);
    }
};

export const find: RequestHandler = async (req, res, next) => {
    try {
        const model = await Departments.findModel(req.params.id);
        res.json(model);
    } catch (error) /* istanbul ignore next */ {
        next(error);
    }
};

export const update: RequestHandler<{ id: string }, any, { data: Department }> = async (req, res, next) => {
    try {
        const model = await Departments.updateModel(req.user!, req.params.id, req.body.data);
        res.notifications = [
            {
                message: { record: NAME, id: model.id },
                event: IoEvent.CHANGED_RECORD,
                to: IoRoom.ALL
            }
        ];
        res.json(model);
    } catch (error) /* istanbul ignore next */ {
        next(error);
    }
};

export const create: RequestHandler<any, any, Department> = async (req, res, next) => {
    try {
        const model = await Departments.createModel(req.user!, req.body);
        res.notifications = [
            {
                message: { record: NAME, id: model.id },
                event: IoEvent.NEW_RECORD,
                to: IoRoom.ALL
            }
        ];
        res.status(201).json(model);
    } catch (error) /* istanbul ignore next */ {
        next(error);
    }
};

export const destroy: RequestHandler<{ id: string }, any, any> = async (req, res, next) => {
    try {
        const model = await Departments.destroy(req.user!, req.params.id);
        res.notifications = [
            {
                message: { record: NAME, id: model.id },
                event: IoEvent.DELETED_RECORD,
                to: IoRoom.ALL
            }
        ];
        res.status(204).send();
    } catch (error) /* istanbul ignore next */ {
        next(error);
    }
};
