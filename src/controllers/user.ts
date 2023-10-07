import type { User, Event } from "@prisma/client";
import {Role} from '@prisma/client';
import { RequestHandler } from "express";
import prisma from "../prisma";
import { IoEvent } from "../routes/socketEventTypes";
import { createDataExtractor } from "./helpers";
import {default as createIcsFile} from '../services/createIcs';
import { IoRoom } from "../routes/socketEvents";
import { default as queryAffectedEvents} from "../services/assets/query.eventsAffectingUser";
import Users from '../models/users';
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { HTTP400Error } from "../utils/errors/Errors";

const NAME = 'USER';
const getData = createDataExtractor<User>(
    []
);

export const user: RequestHandler = async (req, res) => {
    res.json(req.user);
}

export const find: RequestHandler<{ id: string }> = async (req, res, next) => {
    try {
        const user = await Users.findModel(req.params.id);
        res.json(user);
    } catch (error) /* istanbul ignore next */ {
        next(error)
    }
}

export const all: RequestHandler = async (req, res, next) => {
    try {
        const users = await Users.all();
        res.json(users);
    } catch (error) /* istanbul ignore next */ {
        next(error)
    }
}

export const linkToUntis: RequestHandler<{ id: string }, any, { data: { untisId: number } }> = async (req, res, next) => {
    try {
        const user = await Users.linkToUntis(req.user!, req.params.id, req.body.data.untisId || null);

        res.notifications = [
            {
                message: { record: NAME, id: user.id },
                event: IoEvent.CHANGED_RECORD,
                to: IoRoom.ALL
            }
        ];
        res.json(user);
    } catch (error) /* istanbul ignore next */ {
        next(error)
    }
}

export const setRole: RequestHandler<{ id: string }, any, { data: { role: Role } }> = async (req, res, next) => {
   try {
        const user = await Users.setRole(req.user!, req.params.id, req.body.data.role);
        res.notifications = [
            {
                message: { record: NAME, id: user.id },
                event: IoEvent.CHANGED_RECORD,
                to: user.id,
                toSelf: false
            }
        ];
        res.json(user);
    } catch (error) /* istanbul ignore next */ {
        next(error)
    }
}

export const createIcs: RequestHandler<{ id: string }, any, any> = async (req, res, next) => {
    try {
        const user = await Users.createIcs(req.user!, req.params.id);
        res.notifications = [
            {
                message: { record: NAME, id: user.id },
                event: IoEvent.CHANGED_RECORD,
                to: user.id,
                toSelf: false
            }
        ];
        res.json(user);
    } catch (error) /* istanbul ignore next */ {
        next(error)
    }
}



export const affectedEvents: RequestHandler<{ id: string }, string[] | {message: string}, any, {semesterId?: string}> = async (req, res, next) => {
    try {
        const events = await Users.affectedEvents(req.user!, req.params.id, req.query.semesterId);
        res.status(200).json(events.map((e) => e.id));
    } catch (error) /* istanbul ignore next */ {
        next(error);
    }
}
