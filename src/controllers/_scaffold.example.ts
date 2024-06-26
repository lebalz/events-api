import { Semester } from '@prisma/client';
import { RequestHandler } from 'express';
import prisma from '../prisma';
import { IoEvent, RecordType } from '../routes/socketEventTypes';
import { createDataExtractor } from './helpers';
import { IoRoom } from '../routes/socketEvents';

const NAME = RecordType.Semester;
const getData = createDataExtractor<Semester>(['name', 'start', 'end']);
const db = prisma.semester;

export const all: RequestHandler = async (req, res, next) => {
    try {
        const models = await db.findMany({});
        res.json(models);
    } catch (error) /* istanbul ignore next */ {
        next(error);
    }
};

export const find: RequestHandler<{ id: string }, any, any> = async (req, res, next) => {
    try {
        const model = await db.findUnique({
            where: { id: req.params.id }
        });
        res.status(200).json(model);
    } catch (error) /* istanbul ignore next */ {
        next(error);
    }
};

export const create: RequestHandler<any, any, Semester> = async (req, res, next) => {
    const { start, end, name } = req.body;
    try {
        const model = await db.create({
            data: {
                start,
                end,
                name,
                untisSyncDate: new Date()
            }
        });

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
    /** remove fields not updatable*/
    const data = getData(req.body.data);
    try {
        const model = await db.update({
            where: { id: req.params.id },
            data
        });

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
        const model = await db.delete({
            where: {
                id: req.params.id
            }
        });
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
