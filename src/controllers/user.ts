import { RequestHandler } from "express";
import prisma from "../prisma";
  

export const user: RequestHandler = async (req, res) => {
    res.json(req.user);
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