import { RequestHandler } from "express";
import prisma from "../prisma";
  

export const user: RequestHandler = async (req, res) => {
    res.json(req.user);
}

export const users: RequestHandler = async (req, res, next) => {
    try {
        const users = await prisma.user.findMany({});
        res.json(users);
    } catch (error) {
        next(error)
    }
}