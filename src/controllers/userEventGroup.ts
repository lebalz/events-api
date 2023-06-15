import type { RegistrationPeriod, Semester, UserEventGroup } from "@prisma/client";
import { RequestHandler } from "express";
import prisma from "../prisma";
import { IoEvent } from "../routes/socketEventTypes";
import { createDataExtractor } from "./helpers";

const NAME = 'USER_EVENT_GROUP';
const getData = createDataExtractor<UserEventGroup>(
    ['name', 'description']
);
const db = prisma.userEventGroup;

export const allOfUser: RequestHandler = async (req, res, next) => {
    try {
        const models = await db.findMany({
            where: {
                userId: req.user!.id
            }
        });
        res.json(models);
    } catch (error) {
        next(error);
    }
}

export const find: RequestHandler<{ id: string }, any, any> = async (req, res, next) => {
    try {
        const model = await db
            .findUnique({
                where: {id: req.params.id}
            });
        if (model?.userId !== req.user!.id) {
            res.status(403).send();
            return;
        }
        res.status(200).json(model);
    } catch (error) {
        next(error);
    }
}

export const create: RequestHandler<any, any, UserEventGroup & {event_ids: string[]}> = async (req, res, next) => {
    const { name, description, event_ids } = req.body;
    try {
        const model = await db.create({
            data: {
                name,
                description,
                user: {
                    connect: {
                        id: req.user!.id
                    }
                },
                events: {
                    connect: [...new Set(event_ids)].map(id => ({id}))
                }
            }
        });

        res.notifications = [
            {
                message: { record: NAME, id: model.id },
                event: IoEvent.NEW_RECORD,
                to: req.user!.id
            }
        ]
        res.status(201).json(model);
    } catch (e) {
        next(e)
    }
}

export const update: RequestHandler<{ id: string }, any, { data: UserEventGroup }> = async (req, res, next) => {
    /** remove fields not updatable*/
    try {
        const current = await db.findFirst({
            where: {
                AND: {
                    id: req.params.id,
                    userId: req.user!.id
                }
            }
        });
        if (!current) {
            res.status(403).send();
            return;
        }
        const model = await db.update({
            where: { id: req.params.id },
            data: getData(req.body.data)
        });

        res.notifications = [
            {
                message: { record: NAME, id: model.id },
                event: IoEvent.CHANGED_RECORD,
                to: req.user!.id
            }
        ]
        res.status(200).json(model);
    } catch (e) {
        next(e)
    }
}

export const destroy: RequestHandler<{ id: string }, any, any> = async (req, res, next) => {
    try {
        const current = await db.findFirst({
            where: {
                AND: {
                    id: req.params.id,
                    userId: req.user!.id
                }
            }
        });
        if (!current) {
            res.status(403).send();
            return;
        }
        const model = await db.delete({
            where: {
                id: req.params.id,
            },
        });
        res.notifications = [{
            message: { record: NAME, id: model.id },
            event: IoEvent.DELETED_RECORD
        }]
        res.status(204).send();
    } catch (error) {
        next(error);
    }
}