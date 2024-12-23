import { Role, User } from '@prisma/client';
import { RequestHandler } from 'express';
import { IoEvent, RecordType } from '../routes/socketEventTypes';
import { IoRoom } from '../routes/socketEvents';
import Users from '../models/user';
import Events from '../models/event';
import { ApiUser } from '../models/user.helpers';

const NAME = RecordType.User;

export const user: RequestHandler = async (req, res) => {
    res.json(req.user);
};

export const find: RequestHandler<{ id: string }> = async (req, res, next) => {
    try {
        const user = await Users.findModel(req.params.id);
        res.json(user);
    } catch (error) /* istanbul ignore next */ {
        next(error);
    }
};

export const update: RequestHandler<{ id: string }, any, { data: User }> = async (req, res, next) => {
    try {
        const model = await Users.updateModel(req.user!, req.params.id, req.body.data);

        res.notifications = [
            {
                message: { type: NAME, record: model },
                event: IoEvent.CHANGED_RECORD,
                to: req.user!.id
            }
        ];
        res.status(200).json(model);
    } catch (error) /* istanbul ignore next */ {
        next(error);
    }
};

export const all: RequestHandler = async (req, res, next) => {
    try {
        const [users, currentUser] = await Promise.all([Users.all(), Users.findModel(req.user!.id)]);
        if (currentUser) {
            const userIdx = users.findIndex((u) => u.id === currentUser.id);
            users.splice(userIdx, 1, currentUser);
        }
        res.json(users);
    } catch (error) /* istanbul ignore next */ {
        next(error);
    }
};

export const events: RequestHandler = async (req, res, next) => {
    try {
        const user = req.user!;
        const events = await Events.forUser(user);
        res.json(events);
    } catch (error) /* istanbul ignore next */ {
        next(error);
    }
};

export const linkToUntis: RequestHandler<{ id: string }, any, { data: { untisId: number } }> = async (
    req,
    res,
    next
) => {
    try {
        const user = await Users.linkToUntis(req.user!, req.params.id, req.body.data.untisId || null);

        res.notifications = [
            {
                message: { type: NAME, record: user },
                event: IoEvent.CHANGED_RECORD,
                to: IoRoom.ALL
            }
        ];
        res.json(user);
    } catch (error) /* istanbul ignore next */ {
        next(error);
    }
};

export const setRole: RequestHandler<{ id: string }, any, { data: { role: Role } }> = async (
    req,
    res,
    next
) => {
    try {
        const user = await Users.setRole(req.user!, req.params.id, req.body.data.role);
        res.notifications = [
            {
                message: { type: NAME, record: user },
                event: IoEvent.CHANGED_RECORD,
                to: user.id,
                toSelf: false
            }
        ];
        res.json(user);
    } catch (error) /* istanbul ignore next */ {
        next(error);
    }
};

export const createIcs: RequestHandler<{ id: string }, any, any> = async (req, res, next) => {
    try {
        const user = await Users.createIcs(req.user!, req.params.id);
        res.notifications = [
            {
                message: { type: NAME, record: user },
                event: IoEvent.CHANGED_RECORD,
                to: user.id,
                toSelf: false
            }
        ];
        res.json(user);
    } catch (error) /* istanbul ignore next */ {
        next(error);
    }
};

export const affectedEventIds: RequestHandler<
    { id: string },
    string[] | { message: string },
    any,
    { semesterId?: string }
> = async (req, res, next) => {
    try {
        const events = await Users.affectedEvents(req.user!, req.params.id, req.query.semesterId);
        res.status(200).json(events.map((e) => e.id));
    } catch (error) /* istanbul ignore next */ {
        next(error);
    }
};
