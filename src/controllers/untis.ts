import { RequestHandler } from "express";
import prisma from "../prisma";
import { IoEvent } from "../routes/socketEventTypes";
import { notifyChangedRecord } from "../routes/notify";
import { syncUntis2DB } from "../services/syncUntis2DB";

export const teachers: RequestHandler = async (req, res, next) => {
    try {
        const tchrs = await prisma.untisTeacher.findMany({
            include: {
                classes: false,
                lessons: false,
                user: false
            }
        });
        res.json(tchrs);
    } catch (error) {
        next(error);
    }
}

export const teacher: RequestHandler = async (req, res, next) => {
    try {
        const tchr = await prisma.untisTeacher.findUnique({
            where: {
                id: Number.parseInt(req.params.id, 10)
             },
            include: {
                lessons: {
                    include: {
                        teachers: {
                            select: {
                                id: true,
                            }
                        },
                        classes: {
                            select: {
                                id: true,
                            }
                        }
                    }
                },
            }
        });
        res.json(tchr);
    } catch (error) {
        next(error);
    }
}

export const classes: RequestHandler = async (req, res, next) => {
    try {
        const clsx = await prisma.untisClass.findMany({
            include: {
                teachers: {
                    select: {
                        id: true,
                    }
                },
                lessons: {
                    select: {
                        id: true,
                    }
                }
            }
        });
        res.json(clsx);
    } catch (error) {
        next(error);
    }
}

export const sync: RequestHandler = async (req, res, next) => {
    try {
        const syncJob = await prisma.job.create({
            data: {
                type: "SYNC_UNTIS", 
                user: { connect: { id: req.user!.id } } 
            }
        });
        syncUntis2DB().then(() => {
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