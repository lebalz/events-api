import type { EventGroup } from "@prisma/client";
import { RequestHandler } from "express";
import { IoEvent } from "../routes/socketEventTypes";
import UserEventGroups from '../models/eventGroups';
import { ApiEventGroup } from "../models/eventGroup.helpers";

const NAME = 'EVENT_GROUP';

export const allOfUser: RequestHandler = async (req, res, next) => {
    try {
        const models = await UserEventGroups.allOfUser(req.user!);
        res.json(models);
    } catch (error) /* istanbul ignore next */ {
        next(error);
    }
}

export const find: RequestHandler<{ id: string }, any, any> = async (req, res, next) => {
    try {
        const model = await UserEventGroups.findModel(req.user!, req.params.id);
        res.status(200).json(model);
    } catch (error) /* istanbul ignore next */ {
        next(error);
    }
}

export const create: RequestHandler<any, any, EventGroup & { event_ids: string[] }> = async (req, res, next) => {
    try {
        const model = await UserEventGroups.createModel(req.user!, req.body);

        res.notifications = [
            {
                message: { record: NAME, id: model.id },
                event: IoEvent.NEW_RECORD,
                to: req.user!.id
            }
        ]
        res.status(201).json(model);
    } catch (e) /* istanbul ignore next */ {
        next(e)
    }
}

export const update: RequestHandler<{ id: string }, any, { data: ApiEventGroup }> = async (req, res, next) => {
    /** remove fields not updatable*/
    try {
        const model = await UserEventGroups.updateModel(req.user!, req.params.id, req.body.data);

        res.notifications = [
            {
                message: { record: NAME, id: model.id },
                event: IoEvent.CHANGED_RECORD,
                to: req.user!.id
            }
        ]
        res.status(200).json(model);
    } catch (e) /* istanbul ignore next */ {
        next(e)
    }
}

export const destroy: RequestHandler<{ id: string }, any, any> = async (req, res, next) => {
    try {
        const model = await UserEventGroups.destroy(req.user!, req.params.id);
        res.notifications = [{
            message: { record: NAME, id: model.id },
            event: IoEvent.DELETED_RECORD,
            to: req.user!.id
        }]
        res.status(204).send();
    } catch (error) /* istanbul ignore next */ {
        next(error);
    }
}


export const clone: RequestHandler<{ id: string }, any, any> = async (req, res, next) => {
    try {
        const newGroup = await UserEventGroups.cloneModel(req.user!, req.params.id);
        res.notifications = [
            {
                message: { record: NAME, id: newGroup.id },
                event: IoEvent.NEW_RECORD,
                to: req.user!.id
            }
        ];
        res.status(201).json(newGroup);
    } catch (e) /* istanbul ignore next */ {
        next(e)
    }
}

export const events: RequestHandler<{ id: string }, any, any> = async (req, res, next) => {
    try {
        const events = await UserEventGroups.events(req.user!, req.params.id);
        res.status(200).json(events);
    } catch (e) /* istanbul ignore next */ {
        next(e)
    }
}
