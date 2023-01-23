import { RequestHandler } from "express";
import prisma from "../prisma";
import { IoEvent } from "../routes/IoEventTypes";
import { notifyChangedRecord } from "../routes/notify";
  

export const user: RequestHandler = async (req, res) => {
    res.json(req.user);
}

export const find: RequestHandler<{id: string}> = async (req, res, next) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.params.id }
        });
        res.json(user);
    } catch (error) {
        next(error)
    }
}

export const users: RequestHandler = async (req, res, next) => {
    try {
        const users = await prisma.user.findMany({});
        if (req.user) {
            req.io?.to(req.user.id).emit(JSON.stringify(users.map(u => u.email)))
        }
        res.json(users);
    } catch (error) {
        next(error)
    }
}

export const linkToUntis: RequestHandler<{id: string}, any, { data: { untisId: number } }> = async (req, res, next) => {
    if (req.user?.role !== 'ADMIN' && req.user?.id !== req.params.id) {
        throw 'Not authorized'
    }
    try {
        const user = await prisma.user.update({
            where: {
                id: req.params.id
            },
            data: {
                untisId: req.body.data.untisId || null
            }
        })
        notifyChangedRecord(req.io, {record: 'USER', id: user.id});
        res.json(user);
    } catch (error) {
        next(error)
    }
}

