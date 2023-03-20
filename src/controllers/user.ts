import { Role, User } from "@prisma/client";
import { RequestHandler } from "express";
import prisma from "../prisma";
import { IoEvent } from "../routes/socketEventTypes";
import { createDataExtractor } from "./helpers";

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

export const users: RequestHandler = async (req, res, next) => {
    try {
        const users = await db.findMany({});
        res.json(users);
    } catch (error) {
        next(error)
    }
}

export const linkToUntis: RequestHandler<{ id: string }, any, { data: { untisId: number } }> = async (req, res, next) => {
    if (req.user?.role !== Role.ADMIN && req.user?.id !== req.params.id) {
        throw 'Not authorized'
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
                event: IoEvent.CHANGED_RECORD
            }
        ];
        res.json(user);
    } catch (error) {
        next(error)
    }
}

