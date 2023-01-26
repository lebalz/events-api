import { RequestHandler } from "express";
import prisma from "../prisma";


export const find: RequestHandler = async (req, res, next) => {
    try {
        const job = await prisma.job.findUnique({
            where: { id: req.params.id },
            include: { events: true },
        });
        res.json(job);
    } catch (error) {
        next(error);
    }
}

export const all: RequestHandler = async (req, res, next) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user!.id },
            include: {  jobs: true }
        });
        if (!user){ 
            throw new Error('User not found')
        }
        res.json(user.jobs);
    } catch (error) {
        next(error);
    }
}

export const destroy: RequestHandler = async (req, res, next) => {
    try {
        await prisma.job.delete({
            where: { id: req.params.id },
        });
        res.status(204).send();
    } catch (error) {
        next(error);
    }
}
