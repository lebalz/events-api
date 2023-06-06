import type { User, Event } from "@prisma/client";
import {Role} from '@prisma/client';
import { RequestHandler } from "express";
import prisma from "../prisma";
import { IoEvent } from "../routes/socketEventTypes";
import { createDataExtractor } from "./helpers";
import {default as createIcsFile} from '../services/createIcs';
import { IoRoom } from "../routes/socketEvents";
import {default as queryAffectedEvents} from "../services/assets/query.eventsAffectingUser";

const NAME = 'USER';
const getData = createDataExtractor<User>(
    []
);
const db = prisma.user;


export const user: RequestHandler = async (req, res) => {
    res.json(req.user);
}

export const find: RequestHandler<{ id: string }> = async (req, res, next) => {
    try {
        const user = await db.findUnique({
            where: { id: req.params.id }
        });
        res.json(user);
    } catch (error) {
        next(error)
    }
}

export const all: RequestHandler = async (req, res, next) => {
    try {
        const users = await db.findMany({});
        res.json(users);
    } catch (error) {
        next(error)
    }
}

export const linkToUntis: RequestHandler<{ id: string }, any, { data: { untisId: number } }> = async (req, res, next) => {
    if (req.user?.role !== Role.ADMIN && req.user?.id !== req.params.id) {
        return res.status(404).json({ message: 'Not authorized' });
    }
    try {
        const user = await db.update({
            where: {
                id: req.params.id
            },
            data: {
                untisId: req.body.data.untisId || null
            }
        });

        res.notifications = [
            {
                message: { record: NAME, id: user.id },
                event: IoEvent.CHANGED_RECORD,
                to: IoRoom.ALL
            }
        ];
        res.json(user);
    } catch (error) {
        next(error)
    }
}

export const setRole: RequestHandler<{ id: string }, any, { data: { role: Role } }> = async (req, res, next) => {
    if (req.user?.role !== Role.ADMIN) {
        return res.status(404).json({ message: 'Not authorized' });
    }

    try {
        const user = await db.update({
            where: {
                id: req.params.id
            },
            data: {
                role: req.body.data.role
            }
        });

        res.notifications = [
            {
                message: { record: NAME, id: user.id },
                event: IoEvent.CHANGED_RECORD,
                to: IoRoom.ALL,
                toSelf: false
            }
        ];
        res.json(user);
    } catch (error) {
        next(error)
    }
}

export const createIcs: RequestHandler<{ id: string }, any, any> = async (req, res, next) => {
    try {
        if (req.user!.id !== req.params.id) {
            return res.status(404).json({ message: 'Not authorized' });
        }
        const user = await createIcsFile(req.user!.id, '');
        res.json(user);
    } catch (error) {
        next(error)
    }
}



export const affectedEvents: RequestHandler<{ id: string }, string[] | {message: string}, any, {semesterId?: string}> = async (req, res, next) => {
    try {
        const userId = req.params.id;
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (req.user!.id !== userId && req.user!.role !== Role.ADMIN) {
            return res.status(403).json({ message: 'Not authorized' });
        }
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const semesterId = req.query.semesterId as string;
        const semester = semesterId ? 
            await prisma.semester.findUnique({ where: { id: semesterId } }) :
            await prisma.semester.findFirst({ where: {
                start: { lte: new Date() }, 
                end: { gte: new Date() }
            }});
        if (!semester) {
            return res.status(404).json({ message: 'No Semester found' });
        }
        const events = await prisma.$queryRaw<Event[]>(queryAffectedEvents(user.id, { type: "absolute", from: semester.start, to: semester.end}));
        res.status(200).json(events.map((e) => e.id));
    } catch (error) {
        next(error);
    }
}
