import type { Semester } from "@prisma/client";
import { RequestHandler } from "express";
import prisma from "../prisma";
import { IoEvent } from "../routes/socketEventTypes";
import { createDataExtractor } from "./helpers";
import { syncUntis2DB } from "../services/syncUntis2DB";
import { notifyChangedRecord } from "../routes/notify";

const NAME = 'SEMESTER';
const getData = createDataExtractor<Semester>(
    ['name', 'start', 'end', 'untisSyncDate']
);
const db = prisma.semester;

export const all: RequestHandler = async (req, res, next) => {
    try {
        const models = await db.findMany({});
        res.json(models);
    } catch (error) {
        next(error);
    }
}

export const find: RequestHandler<{ id: string }, any, any> = async (req, res, next) => {
    try {
        const model = await db
            .findUnique({
                where: { id: req.params.id }
            });
        res.status(200).json(model);
    } catch (error) {
        next(error);
    }
}

export const create: RequestHandler<any, any, Semester> = async (req, res, next) => {
    const { start, end, name } = req.body;
    const syncDate = new Date(start.getTime() + (end.getTime() - start.getTime()) / 2);
    try {
        const model = await db.create({
            data: {
                start: start,
                end: end,
                name: name,
                untisSyncDate: syncDate
            }
        });

        res.notifications = [
            {
                message: { record: NAME, id: model.id },
                event: IoEvent.NEW_RECORD
            }
        ]
        res.status(201).json(model);
    } catch (e) {
        next(e)
    }
}

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
                message: { record: NAME, id: model.id },
                event: IoEvent.CHANGED_RECORD
            }
        ]
        res.status(200).json(model);
    } catch (e) {
        next(e)
    }
}

export const destroy: RequestHandler<{ id: string }, any, any> = async (req, res, next) => {
    try {
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


export const sync: RequestHandler<{ id: string }, any, any> = async (req, res, next) => {
    try {
        const syncJob = await prisma.job.create({
            data: {
                type: "SYNC_UNTIS", 
                user: { connect: { id: req.user!.id } } 
            }
        });
        syncUntis2DB(req.params.id).then(() => {
            return prisma.job.update({
                where: { id: syncJob.id },
                data: {
                    state: 'DONE',
                }
            });
        }).catch((error) => {
            console.log(error);
            return prisma.job.update({
                where: { id: syncJob.id },
                data: {
                  state: 'ERROR',
                  log: JSON.stringify(error, Object.getOwnPropertyNames(error))
                }
              });
        }).finally(() => {
            notifyChangedRecord(req.io, { record: 'JOB', id: syncJob.id });
        });

        res.notifications = [
            {
                message: { record: 'JOB', id: syncJob.id },
                event: IoEvent.NEW_RECORD,
                to: req.user!.id
            }
        ];
        res.json(syncJob);
    } catch (error) {
        next(error);
    }
}