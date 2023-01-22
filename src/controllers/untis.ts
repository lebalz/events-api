import { RequestHandler } from "express";
import prisma from "../prisma";
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

export const sync: RequestHandler = async (req, res, next) => {
    try {
        syncUntis2DB().then(() => {
            req.io?.emit("sync", JSON.stringify({ success: true }));
        }).catch((error) => {
            req.io?.emit("sync", JSON.stringify({ success: false, error: error }));
        });
        res.json({ message: "Sync started" });
    } catch (error) {
        next(error);
    }
}